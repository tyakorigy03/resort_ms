const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapPeriod(row) {
  if (!row) return null
  return {
    id: row.id,
    outletId: row.outlet_id,
    outletName: row.outlet_name || null,
    openedByStaffId: row.opened_by_staff_id,
    openedByStaffName: row.opened_by_staff_name || null,
    openedOnDeviceId: row.opened_on_device_id,
    openedOnDeviceName: row.opened_device_name || null,
    openedAt: row.opened_at,
    closedByStaffId: row.closed_by_staff_id,
    closedByStaffName: row.closed_by_staff_name || null,
    closedOnDeviceId: row.closed_on_device_id,
    closedOnDeviceName: row.closed_device_name || null,
    closedAt: row.closed_at,
    openingNotes: row.opening_notes,
    closingNotes: row.closing_notes,
  }
}

async function findOpenByOutlet(outletId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.outlet_id, o.name AS outlet_name,
            p.opened_by_staff_id, CONCAT_WS(' ', os.first_name, os.last_name) AS opened_by_staff_name,
            p.opened_on_device_id, od.name AS opened_device_name,
            p.opened_at, p.closed_by_staff_id, p.closed_on_device_id, p.closed_at,
            p.opening_notes, p.closing_notes,
            CONCAT_WS(' ', cs.first_name, cs.last_name) AS closed_by_staff_name,
            cd.name AS closed_device_name
     FROM sale_periods p
     JOIN outlets o ON o.id = p.outlet_id
     LEFT JOIN staff os ON os.id = p.opened_by_staff_id
     LEFT JOIN devices od ON od.id = p.opened_on_device_id
     LEFT JOIN staff cs ON cs.id = p.closed_by_staff_id
     LEFT JOIN devices cd ON cd.id = p.closed_on_device_id
     WHERE p.outlet_id = ? AND p.closed_at IS NULL
     ORDER BY p.opened_at DESC
     LIMIT 1`,
    [outletId],
  )
  return mapPeriod(rows[0])
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT p.id, p.outlet_id, o.name AS outlet_name,
            p.opened_by_staff_id, CONCAT_WS(' ', os.first_name, os.last_name) AS opened_by_staff_name,
            p.opened_on_device_id, od.name AS opened_device_name,
            p.opened_at, p.closed_by_staff_id, p.closed_on_device_id, p.closed_at,
            p.opening_notes, p.closing_notes,
            CONCAT_WS(' ', cs.first_name, cs.last_name) AS closed_by_staff_name,
            cd.name AS closed_device_name
     FROM sale_periods p
     JOIN outlets o ON o.id = p.outlet_id
     LEFT JOIN staff os ON os.id = p.opened_by_staff_id
     LEFT JOIN devices od ON od.id = p.opened_on_device_id
     LEFT JOIN staff cs ON cs.id = p.closed_by_staff_id
     LEFT JOIN devices cd ON cd.id = p.closed_on_device_id
     WHERE p.id = ?`,
    [id],
  )
  return mapPeriod(rows[0])
}

async function open({ outletId, openedByStaffId, openedOnDeviceId, openingNotes }) {
  const existing = await findOpenByOutlet(outletId)
  if (existing) throw httpError('A sales period is already open for this outlet', 409)
  const [result] = await pool.query(
    'INSERT INTO sale_periods (outlet_id, opened_by_staff_id, opened_on_device_id, opening_notes) VALUES (?, ?, ?, ?)',
    [outletId, openedByStaffId || null, openedOnDeviceId || null, openingNotes || null],
  )
  return findById(result.insertId)
}

async function close(id, { closedByStaffId, closedOnDeviceId, closingNotes }) {
  const [rows] = await pool.query('SELECT id, closed_at FROM sale_periods WHERE id = ?', [id])
  if (!rows.length) throw httpError('Sales period not found', 404)
  if (rows[0].closed_at) throw httpError('Sales period is already closed', 409)
  await pool.query(
    'UPDATE sale_periods SET closed_at = NOW(), closed_by_staff_id = ?, closed_on_device_id = ?, closing_notes = ? WHERE id = ?',
    [closedByStaffId || null, closedOnDeviceId || null, closingNotes || null, id],
  )
  return findById(id)
}

async function listByOutlet(outletId, { limit = 20 } = {}) {
  const [rows] = await pool.query(
    `SELECT p.id, p.outlet_id, o.name AS outlet_name,
            p.opened_by_staff_id, CONCAT_WS(' ', os.first_name, os.last_name) AS opened_by_staff_name,
            p.opened_on_device_id, od.name AS opened_device_name,
            p.opened_at, p.closed_by_staff_id, p.closed_on_device_id, p.closed_at,
            p.opening_notes, p.closing_notes,
            CONCAT_WS(' ', cs.first_name, cs.last_name) AS closed_by_staff_name,
            cd.name AS closed_device_name
     FROM sale_periods p
     JOIN outlets o ON o.id = p.outlet_id
     LEFT JOIN staff os ON os.id = p.opened_by_staff_id
     LEFT JOIN devices od ON od.id = p.opened_on_device_id
     LEFT JOIN staff cs ON cs.id = p.closed_by_staff_id
     LEFT JOIN devices cd ON cd.id = p.closed_on_device_id
     WHERE p.outlet_id = ?
     ORDER BY p.opened_at DESC
     LIMIT ?`,
    [outletId, Number(limit)],
  )
  return rows.map(mapPeriod)
}

module.exports = { findOpenByOutlet, findById, open, close, listByOutlet }
