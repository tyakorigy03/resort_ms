const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapEvent(row) {
  if (!row) return null
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name || null,
    deviceId: row.device_id,
    deviceName: row.device_name || null,
    clockedInAt: row.clocked_in_at,
    clockedOutAt: row.clocked_out_at,
    method: row.method,
    openingCash: Number(row.opening_cash ?? 0),
    closingCash: row.closing_cash == null ? null : Number(row.closing_cash),
    notes: row.notes,
  }
}

const EVENT_COLUMNS = `
  e.id, e.staff_id, e.device_id, e.clocked_in_at, e.clocked_out_at, e.method,
  e.opening_cash, e.closing_cash, e.notes,
  CONCAT_WS(' ', s.first_name, s.last_name) AS staff_name, d.name AS device_name
`

// Till reconciliation for a shift: expected cash is the float counted at
// clock-in plus cash taken in (payment minus change) minus cash refunded on
// voided cash orders, all within the shift window. variance is only meaningful
// once the closing count exists.
async function cashFor(event) {
  const [[paid]] = await pool.query(
    `SELECT COALESCE(SUM(o.payment_received - o.change_due), 0) AS cash_net,
            COALESCE(SUM(CASE WHEN o.status = 'void' AND o.payment_received IS NOT NULL THEN o.payment_received ELSE 0 END), 0) AS cash_refunded
     FROM pos_orders o
     WHERE o.staff_id = ?
       AND o.payment_method = 'cash'
       AND o.status IN ('paid', 'void')
       AND o.created_at >= ?
       AND o.created_at <= ?`,
    [event.staffId, event.clockedInAt, event.clockedOutAt || new Date()],
  )
  const cashNet = Number(paid.cash_net)
  const cashRefunded = Number(paid.cash_refunded)
  const opening = event.openingCash
  const closing = event.closingCash
  const expected = opening + cashNet - cashRefunded
  return {
    opening,
    closing,
    expected: Math.round(expected * 100) / 100,
    variance: closing == null ? null : Math.round((closing - expected) * 100) / 100,
  }
}

// Full shift summary for the clock-in/out screens: till reconciliation plus
// sales figures (paid orders only) and elapsed time for the shift window.
async function summaryFor(event) {
  const cash = await cashFor(event)
  const [[rows]] = await pool.query(
    `SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS sales_total
     FROM pos_orders
     WHERE staff_id = ?
       AND status = 'paid'
       AND created_at >= ?
       AND created_at <= ?`,
    [event.staffId, event.clockedInAt, event.clockedOutAt || new Date()],
  )
  return {
    ...event,
    cash,
    orderCount: Number(rows.order_count),
    salesTotal: Math.round(Number(rows.sales_total) * 100) / 100,
    durationSeconds: Math.max(0, Math.floor((new Date(event.clockedOutAt || new Date()) - new Date(event.clockedInAt)) / 1000)),
  }
}

// Staff currently clocked in, scoped to an outlet through the device they used.
async function findActiveByOutlet(outletId) {
  const [rows] = await pool.query(
    `SELECT ${EVENT_COLUMNS}
     FROM staff_clock_events e
     JOIN staff s ON s.id = e.staff_id
     LEFT JOIN devices d ON d.id = e.device_id
     LEFT JOIN outlets o ON o.id = d.outlet_id
     WHERE e.clocked_out_at IS NULL
       AND (o.id = ? OR d.id IS NULL)
     ORDER BY e.clocked_in_at ASC`,
    [outletId],
  )
  return rows.map(mapEvent)
}

async function findActiveByStaff(staffId) {
  const [rows] = await pool.query(
    `SELECT ${EVENT_COLUMNS}
     FROM staff_clock_events e
     JOIN staff s ON s.id = e.staff_id
     LEFT JOIN devices d ON d.id = e.device_id
     WHERE e.staff_id = ? AND e.clocked_out_at IS NULL
     ORDER BY e.clocked_in_at DESC`,
    [staffId],
  )
  return rows.map(mapEvent)
}

async function clockIn({ staffId, deviceId, method, openingCash, notes }) {
  const active = await findActiveByStaff(staffId)
  if (active.length > 0) throw httpError('Staff member is already clocked in', 409)
  const opening = Number(openingCash) || 0
  const [result] = await pool.query(
    'INSERT INTO staff_clock_events (staff_id, device_id, method, opening_cash, notes) VALUES (?, ?, ?, ?, ?)',
    [staffId, deviceId || null, method || 'pin', opening, notes || null],
  )
  return findById(result.insertId)
}

async function clockOut(id, { notes, closingCash } = {}) {
  const [rows] = await pool.query('SELECT id, clocked_out_at FROM staff_clock_events WHERE id = ?', [id])
  if (!rows.length) throw httpError('Clock event not found', 404)
  if (rows[0].clocked_out_at) throw httpError('Shift is already closed', 409)
  const closing = closingCash === undefined || closingCash === null ? null : Number(closingCash)
  await pool.query(
    'UPDATE staff_clock_events SET clocked_out_at = NOW(), closing_cash = ?, notes = COALESCE(?, notes) WHERE id = ?',
    [closing, notes || null, id],
  )
  const event = await findById(id)
  return summaryFor(event)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${EVENT_COLUMNS}
     FROM staff_clock_events e
     JOIN staff s ON s.id = e.staff_id
     LEFT JOIN devices d ON d.id = e.device_id
     WHERE e.id = ?`,
    [id],
  )
  return mapEvent(rows[0])
}

// Shifts that overlap a sale period (clocked in before it closed and not
// clocked out before it opened), scoped to the period's outlet, each with its
// till reconciliation. Used by the period-close report.
async function findShiftsForPeriod(period) {
  const cutoff = period.closedAt || new Date()
  const [rows] = await pool.query(
    `SELECT ${EVENT_COLUMNS}
     FROM staff_clock_events e
     JOIN staff s ON s.id = e.staff_id
     LEFT JOIN devices d ON d.id = e.device_id
     LEFT JOIN outlets o ON o.id = d.outlet_id
     WHERE e.clocked_in_at < ?
       AND (e.clocked_out_at IS NULL OR e.clocked_out_at > ?)
       AND (o.id = ? OR d.id IS NULL)
     ORDER BY e.clocked_in_at ASC`,
    [cutoff, period.openedAt, period.outletId],
  )
  return Promise.all(rows.map(mapEvent).map(async (event) => ({ ...event, cash: await cashFor(event) })))
}

module.exports = { findActiveByOutlet, findActiveByStaff, clockIn, clockOut, findById, summaryFor, findShiftsForPeriod }
