const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapSession(row) {
  if (!row) return null
  return {
    id: row.id,
    tableId: row.table_id,
    tableLabel: row.table_label || null,
    floorPlanId: row.floor_plan_id,
    floorPlanName: row.floor_plan_name || null,
    outletId: row.outlet_id,
    openedByStaffId: row.opened_by_staff_id,
    openedByStaffName: row.opened_by_staff_name || null,
    openedOnDeviceId: row.opened_on_device_id,
    covers: row.covers === null ? null : Number(row.covers),
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openOrderId: row.open_order_id || null,
  }
}

const BASE_SELECT = `
  SELECT ts.id, ts.table_id, ts.outlet_id, ts.opened_by_staff_id, ts.opened_on_device_id,
         ts.covers, ts.status, ts.opened_at, ts.closed_at,
         t.label AS table_label, t.floor_plan_id, fp.name AS floor_plan_name,
         CONCAT_WS(' ', s.first_name, s.last_name) AS opened_by_staff_name,
         (SELECT o.id FROM pos_orders o
           WHERE o.table_session_id = ts.id AND o.status = 'open'
           ORDER BY o.id LIMIT 1) AS open_order_id
  FROM table_sessions ts
  JOIN restaurant_tables t ON t.id = ts.table_id
  LEFT JOIN floor_plans fp ON fp.id = t.floor_plan_id
  LEFT JOIN staff s ON s.id = ts.opened_by_staff_id`

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE ts.id = ?`, [id])
  return mapSession(rows[0] || null)
}

async function findOpenByTable(tableId) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE ts.table_id = ? AND ts.status = 'open' ORDER BY ts.id DESC LIMIT 1`, [
    tableId,
  ])
  return mapSession(rows[0] || null)
}

async function listActiveByOutlet(outletId) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE ts.outlet_id = ? AND ts.status = 'open' ORDER BY ts.opened_at ASC`, [
    outletId,
  ])
  return rows.map(mapSession)
}

async function open({ tableId, outletId, openedByStaffId, openedOnDeviceId, covers }) {
  const existing = await findOpenByTable(tableId)
  if (existing) throw httpError('This table is already occupied', 409)
  const [result] = await pool.query(
    `INSERT INTO table_sessions (table_id, outlet_id, opened_by_staff_id, opened_on_device_id, covers)
     VALUES (?, ?, ?, ?, ?)`,
    [tableId, outletId, openedByStaffId || null, openedOnDeviceId || null, covers === undefined || covers === null ? null : Number(covers)],
  )
  await pool.query("UPDATE restaurant_tables SET status = 'seated' WHERE id = ?", [tableId])
  return findById(result.insertId)
}

async function close(id) {
  const session = await findById(id)
  if (!session) throw httpError('Table session not found', 404)
  if (session.status !== 'open') throw httpError('Table session is already closed', 409)
  if (session.openOrderId) {
    throw httpError('This table still has an open order; finish or cancel it first', 409)
  }
  await pool.query('UPDATE table_sessions SET status = ?, closed_at = NOW() WHERE id = ?', ['closed', id])
  await pool.query("UPDATE restaurant_tables SET status = 'available' WHERE id = ?", [session.tableId])
  return findById(id)
}

module.exports = { findById, findOpenByTable, listActiveByOutlet, open, close }
