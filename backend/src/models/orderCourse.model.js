const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')
const posOrderModel = require('./posOrder.model')

async function listByOrder(orderId) {
  const [rows] = await pool.query(
    `SELECT id, order_id, course_number, name, fired_at, status
     FROM order_courses WHERE order_id = ? ORDER BY course_number ASC`,
    [orderId],
  )
  return rows.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    courseNumber: Number(r.course_number),
    name: r.name,
    firedAt: r.fired_at,
    status: r.status,
  }))
}

async function addCourse(orderId) {
  const [orderRows] = await pool.query('SELECT id, status FROM pos_orders WHERE id = ?', [orderId])
  if (!orderRows.length) throw httpError('Order not found', 404)
  if (orderRows[0].status !== 'open') throw httpError('Order is already closed', 409)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [maxRow] = await conn.query(
      'SELECT COALESCE(MAX(course_number), 0) AS max_num FROM order_courses WHERE order_id = ?',
      [orderId],
    )
    const courseNumber = Number(maxRow[0].max_num) + 1
    const [result] = await conn.query(
      'INSERT INTO order_courses (order_id, course_number, name) VALUES (?, ?, ?)',
      [orderId, courseNumber, `Course ${courseNumber}`],
    )
    await conn.commit()
    return { id: result.insertId, orderId, courseNumber, name: `Course ${courseNumber}`, firedAt: null, status: 'new' }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// Fire every unfired item of a course to the kitchen. Items are routed through
// their accounting group -> production centers; the first station owns the line
// and the rest receive duplicate rows (is_station_copy=1, line_total=0) so
// order totals stay correct. Items with no route are left unfired.
async function fireCourse(orderId, courseId) {
  const [courseRows] = await pool.query(
    'SELECT id, order_id, fired_at FROM order_courses WHERE id = ? AND order_id = ?',
    [courseId, orderId],
  )
  if (!courseRows.length) throw httpError('Course not found', 404)
  if (courseRows[0].fired_at) throw httpError('Course is already fired', 409)

  const [itemRows] = await pool.query(
    `SELECT id, item_id, quantity, seat_number, course_id
     FROM pos_order_items
     WHERE order_id = ? AND course_id = ? AND is_station_copy = 0 AND fired_at IS NULL AND kds_status != 'cancelled'`,
    [orderId, courseId],
  )

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const item of itemRows) {
      const stations = await posOrderModel.stationsForItem(item.item_id)
      if (stations.length === 0) continue
      const firedAt = new Date()
      await conn.query(
        `UPDATE pos_order_items
         SET production_center_id = ?, fired_at = ?, kds_status = 'new'
         WHERE id = ?`,
        [stations[0], firedAt, item.id],
      )
      for (const extraStation of stations.slice(1)) {
        await conn.query(
          `INSERT INTO pos_order_items
             (order_id, item_id, item_name, unit_price, quantity, line_total, course_id, seat_number,
              production_center_id, is_station_copy, kds_status, fired_at)
           SELECT order_id, item_id, item_name, unit_price, quantity, 0, course_id, seat_number,
                  ?, 1, 'new', ?
           FROM pos_order_items WHERE id = ?`,
          [extraStation, firedAt, item.id],
        )
      }
    }
    await conn.query(
      `UPDATE order_courses SET fired_at = ?, status = 'preparing' WHERE id = ?`,
      [new Date(), courseId],
    )
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  return posOrderModel.findById(orderId)
}

// Serve a fired course: mark every in-flight item of the course (including
// station copies) as completed so the KDS board clears, and flag the course
// itself as served. Unfired lines (added after firing) are left untouched.
async function serveCourse(orderId, courseId) {
  const [courseRows] = await pool.query(
    'SELECT id, order_id, fired_at FROM order_courses WHERE id = ? AND order_id = ?',
    [courseId, orderId],
  )
  if (!courseRows.length) throw httpError('Course not found', 404)
  if (!courseRows[0].fired_at) throw httpError('Course is not fired yet', 409)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      `UPDATE pos_order_items
       SET kds_status = 'completed', completed_at = NOW()
       WHERE order_id = ? AND course_id = ? AND fired_at IS NOT NULL AND kds_status NOT IN ('completed', 'cancelled')`,
      [orderId, courseId],
    )
    await conn.query(
      'UPDATE order_courses SET status = ? WHERE id = ?',
      ['completed', courseId],
    )
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  return posOrderModel.findById(orderId)
}

// Set a course's own status (new / preparing / ready / completed / on_hold /
// cancelled). Used by the register's "On hold" action; does not touch fired_at.
async function setStatus(orderId, courseId, status) {
  const allowed = ['new', 'preparing', 'ready', 'completed', 'on_hold', 'cancelled']
  if (!allowed.includes(status)) throw httpError('Invalid course status', 400)
  const [result] = await pool.query(
    'UPDATE order_courses SET status = ? WHERE id = ? AND order_id = ?',
    [status, courseId, orderId],
  )
  if (result.affectedRows === 0) throw httpError('Course not found', 404)
  return posOrderModel.findById(orderId)
}

module.exports = { listByOrder, addCourse, fireCourse, serveCourse, setStatus }
