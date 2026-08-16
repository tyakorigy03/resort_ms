const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

const FOLIO_SELECT = `
  SELECT f.id, f.reservation_id, f.customer_id, f.room_id, f.status, f.opened_at, f.closed_at, f.balance,
         c.first_name, c.last_name,
         CONCAT_WS(' ', c.first_name, c.last_name) AS guest_name,
         r.room_number,
         rv.check_in_date, rv.check_out_date,
         rt.name AS room_type_name,
         rt.base_rate,
         rp.name AS rate_plan_name
  FROM folios f
  JOIN customers c ON c.id = f.customer_id
  LEFT JOIN rooms r ON r.id = f.room_id
  LEFT JOIN reservations rv ON rv.id = f.reservation_id
  LEFT JOIN room_types rt ON rt.id = COALESCE(r.room_type_id, rv.room_type_id)
  LEFT JOIN rate_plans rp ON rp.id = rv.rate_plan_id`

function mapFolio(row, lines) {
  if (!row) return null
  return {
    id: row.id,
    reservationId: row.reservation_id,
    customerId: row.customer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    guestName: row.guest_name,
    roomId: row.room_id,
    roomNumber: row.room_number || null,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    roomTypeName: row.room_type_name || null,
    baseRate: row.base_rate !== null && row.base_rate !== undefined ? Number(row.base_rate) : null,
    ratePlanName: row.rate_plan_name || null,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    balance: Number(row.balance),
    lines: lines || [],
  }
}

function mapLine(row) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amount: Number(row.amount),
    sourceOrderId: row.source_order_id,
    sourceOrderNumber: row.order_number || null,
    staffId: row.staff_id,
    createdAt: row.created_at,
  }
}

async function linesFor(folioId) {
  const [rows] = await pool.query(
    `SELECT fli.*, po.order_number
     FROM folio_line_items fli
     LEFT JOIN pos_orders po ON po.id = fli.source_order_id
     WHERE fli.folio_id = ?
     ORDER BY fli.created_at ASC, fli.id ASC`,
    [folioId],
  )
  return rows.map(mapLine)
}

async function findById(id) {
  const [rows] = await pool.query(`${FOLIO_SELECT} WHERE f.id = ?`, [Number(id)])
  if (!rows[0]) return null
  return mapFolio(rows[0], await linesFor(Number(id)))
}

async function findByReservation(reservationId, openOnly = true) {
  const [rows] = await pool.query(
    `${FOLIO_SELECT}
     WHERE f.reservation_id = ?${openOnly ? " AND f.status = 'open'" : ''}
     ORDER BY f.id DESC`,
    [Number(reservationId)],
  )
  return Promise.all(rows.map(async (row) => mapFolio(row, await linesFor(row.id))))
}

async function search({ roomNumber, guestName } = {}) {
  const conditions = ["f.status = 'open'"]
  const params = []
  if (roomNumber) {
    conditions.push('r.room_number = ?')
    params.push(String(roomNumber))
  }
  if (guestName) {
    conditions.push('CONCAT_WS(\' \', c.first_name, c.last_name) LIKE ?')
    params.push(`%${guestName}%`)
  }
  const [rows] = await pool.query(
    `${FOLIO_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY f.updated_at DESC
     LIMIT 25`,
    params,
  )
  return Promise.all(rows.map(async (row) => mapFolio(row, await linesFor(row.id))))
}

async function recomputeBalance(conn, folioId) {
  await conn.query(
    'UPDATE folios SET balance = (SELECT COALESCE(SUM(amount), 0) FROM folio_line_items WHERE folio_id = ?) WHERE id = ?',
    [folioId, folioId],
  )
}

async function addLine(folioId, { type, description, amount, sourceOrderId, staffId }) {
  if (!type || amount === undefined || amount === null || Number(amount) === 0) {
    throw httpError('A non-zero amount is required', 400)
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [folios] = await conn.query(
      `SELECT id FROM folios WHERE id = ? AND status = 'open' FOR UPDATE`,
      [Number(folioId)],
    )
    if (!folios.length) throw httpError('Folio is not open', 400)
    await conn.query(
      'INSERT INTO folio_line_items (folio_id, type, description, amount, source_order_id, staff_id) VALUES (?, ?, ?, ?, ?, ?)',
      [Number(folioId), type, description || null, Number(amount), sourceOrderId ? Number(sourceOrderId) : null, staffId ? Number(staffId) : null],
    )
    await recomputeBalance(conn, folioId)
    await conn.commit()
    return findById(folioId)
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function create({ reservationId, customerId, roomId }) {
  const [result] = await pool.query(
    'INSERT INTO folios (reservation_id, customer_id, room_id, status) VALUES (?, ?, ?, ?)',
    [reservationId ? Number(reservationId) : null, Number(customerId), roomId ? Number(roomId) : null, 'open'],
  )
  return findById(result.insertId)
}

async function postRoomCharges(folioId, { nights, rate, description }) {
  if (!nights || Number(nights) <= 0) throw httpError('Nights are required', 400)
  if (!rate || Number(rate) < 0) throw httpError('A valid rate is required', 400)
  const amount = Math.round(Number(nights) * Number(rate) * 100) / 100
  const folio = await findById(folioId)
  if (!folio) throw httpError('Folio not found', 404)
  const label = description || (folio.checkInDate && folio.checkOutDate
    ? `Room charges ${folio.checkInDate} to ${folio.checkOutDate}`
    : 'Room charges')
  return addLine(folioId, {
    type: 'room_charge',
    description: `${label} (${nights} night${nights === 1 ? '' : 's'} @ ${Number(rate).toFixed(2)})`,
    amount,
  })
}

module.exports = { findById, findByReservation, search, addLine, create, postRoomCharges, recomputeBalance }
