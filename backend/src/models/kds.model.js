const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

const TICKET_SELECT = `
  SELECT o.id AS order_id, o.order_number, o.order_type, o.collection_code, o.covers,
         o.created_at AS order_created_at, o.status AS order_status,
         CONCAT_WS(' ', s.first_name, s.last_name) AS staff_name,
         t.label AS table_label, fp.name AS floor_plan_name,
         oc.id AS course_id, oc.course_number, oc.name AS course_name, oc.fired_at AS course_fired_at,
         poi.id, poi.item_id, poi.item_name, poi.quantity, poi.seat_number,
         poi.production_center_id, poi.kds_status, poi.fired_at, poi.preparing_at, poi.ready_at, poi.completed_at,
         poi.updated_at
  FROM pos_order_items poi
  JOIN pos_orders o ON o.id = poi.order_id
  LEFT JOIN staff s ON s.id = o.staff_id
  LEFT JOIN table_sessions ts ON ts.id = o.table_session_id
  LEFT JOIN restaurant_tables t ON t.id = ts.table_id
  LEFT JOIN floor_plans fp ON fp.id = t.floor_plan_id
  LEFT JOIN order_courses oc ON oc.id = poi.course_id
  WHERE poi.production_center_id = ?
    AND poi.kds_status NOT IN ('completed', 'cancelled')`

async function getTickets(stationId) {
  const [rows] = await pool.query(`${TICKET_SELECT} ORDER BY poi.fired_at ASC, poi.id ASC`, [stationId])
  const map = new Map()
  for (const row of rows) {
    const key = `${row.order_id}|${row.course_id ?? 'none'}`
    let ticket = map.get(key)
    if (!ticket) {
      ticket = {
        orderId: row.order_id,
        orderNumber: row.order_number,
        orderType: row.order_type,
        orderStatus: row.order_status,
        collectionCode: row.collection_code,
        covers: row.covers === null ? null : Number(row.covers),
        createdAt: row.order_created_at,
        staffName: row.staff_name || null,
        tableLabel: row.table_label || null,
        floorPlanName: row.floor_plan_name || null,
        courseId: row.course_id,
        courseNumber: row.course_number === null ? null : Number(row.course_number),
        courseName: row.course_name || 'Course 1',
        courseFiredAt: row.course_fired_at,
        items: [],
      }
      map.set(key, ticket)
    }
    ticket.items.push({
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      quantity: Number(row.quantity),
      seatNumber: row.seat_number === null ? null : Number(row.seat_number),
      kdsStatus: row.kds_status,
      firedAt: row.fired_at,
      preparingAt: row.preparing_at,
      readyAt: row.ready_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    })
  }
  const tickets = [...map.values()].sort((a, b) => {
    const aTime = new Date(a.items[0]?.firedAt || a.courseFiredAt || 0).getTime()
    const bTime = new Date(b.items[0]?.firedAt || b.courseFiredAt || 0).getTime()
    return aTime - bTime
  })
  return tickets
}

// Advance a single item's kitchen status. Returns the fresh ticket list for
// the station plus a boolean telling whether the whole order is now done.
async function updateItemStatus(itemId, stationId, status) {
  const allowed = ['new', 'preparing', 'ready', 'completed', 'on_hold', 'cancelled']
  if (!allowed.includes(status)) throw httpError('Invalid kitchen status', 400)
  const [itemRows] = await pool.query(
    'SELECT order_id, course_id FROM pos_order_items WHERE id = ? AND production_center_id = ?',
    [itemId, stationId],
  )
  if (!itemRows.length) throw httpError('Item not found on this station', 404)

  let orderCompleted = false
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      `UPDATE pos_order_items SET kds_status = ?,
        preparing_at = IF(? = 'preparing', NOW(), preparing_at),
        ready_at = IF(? = 'ready', NOW(), ready_at),
        completed_at = IF(? IN ('completed','cancelled'), NOW(), completed_at)
       WHERE id = ? AND production_center_id = ?`,
      [status, status, status, status, itemId, stationId],
    )
    if (status === 'completed' || status === 'cancelled') {
      await conn.query(
        `UPDATE order_courses oc
         SET oc.status = 'completed'
         WHERE oc.id = ? AND NOT EXISTS (
           SELECT 1 FROM pos_order_items i
           WHERE i.course_id = oc.id AND i.is_station_copy = 0 AND i.kds_status NOT IN ('completed','cancelled')
         )`,
        [itemRows[0].course_id],
      )
      // Kitchen-done for the whole order is derived, not stored: pos_orders.status
      // only tracks the sales lifecycle (open -> paid -> void).
      const [remaining] = await conn.query(
        `SELECT COUNT(*) AS total FROM pos_order_items
         WHERE order_id = ? AND kds_status NOT IN ('completed','cancelled')`,
        [itemRows[0].order_id],
      )
      orderCompleted = Number(remaining[0].total) === 0
    }
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  return { tickets: await getTickets(stationId), orderId: itemRows[0].order_id, orderCompleted }
}

module.exports = { getTickets, updateItemStatus }
