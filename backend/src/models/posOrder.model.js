const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')
const priceModel = require('./price.model')
const tableSessionModel = require('./tableSession.model')

function mapOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    orderNumber: row.order_number,
    outletId: row.outlet_id,
    deviceId: row.device_id,
    staffId: row.staff_id,
    staffName: row.staff_name || null,
    salePeriodId: row.sale_period_id,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
    tableSessionId: row.table_session_id,
    tableLabel: row.table_label || null,
    floorPlanId: row.floor_plan_id || null,
    floorPlanName: row.floor_plan_name || null,
    courseName: row.course_name || null,
    status: row.status,
    orderType: row.order_type,
    collectionCode: row.collection_code || null,
    covers: row.covers === null ? null : Number(row.covers),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    tip: row.tip === null ? null : Number(row.tip),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    paymentReceived: row.payment_received === null ? null : Number(row.payment_received),
    changeDue: row.change_due === null ? null : Number(row.change_due),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    courses: row.courses || [],
    unassignedItems: row.unassigned_items || [],
  }
}

const BASE_SELECT = `
  SELECT o.id, o.order_number, o.outlet_id, o.device_id, o.staff_id, o.sale_period_id,
         o.customer_id, o.table_session_id, o.status, o.order_type, o.collection_code, o.covers,
         o.subtotal, o.discount, o.tax, o.tip, o.total, o.payment_method, o.payment_received,
         o.change_due, o.created_at, o.updated_at, o.completed_at,
         CONCAT_WS(' ', s.first_name, s.last_name) AS staff_name,
         CONCAT_WS(' ', c.first_name, c.last_name) AS customer_name,
         t.label AS table_label, fp.id AS floor_plan_id, fp.name AS floor_plan_name,
         (SELECT oc.name FROM order_courses oc WHERE oc.order_id = o.id ORDER BY oc.course_number ASC LIMIT 1) AS course_name
  FROM pos_orders o
  LEFT JOIN staff s ON s.id = o.staff_id
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN table_sessions ts ON ts.id = o.table_session_id
  LEFT JOIN restaurant_tables t ON t.id = ts.table_id
  LEFT JOIN floor_plans fp ON fp.id = t.floor_plan_id`

// Selling price comes from the same source the POS menu shows: the default
// price list's menu_prices. item_prices is a costing history, not the menu.
async function findItemPrice(itemId) {
  const [rows] = await pool.query(
    `SELECT mp.price FROM menu_prices mp
     JOIN price_lists pl ON pl.id = mp.price_list_id
     WHERE mp.item_id = ? AND pl.is_default = 1
     ORDER BY mp.id ASC LIMIT 1`,
    [itemId],
  )
  return rows[0] ? Number(rows[0].price) : null
}

// Kitchen stations for an item: its accounting group (matched by name) mapped to
// production centers. Zero entries means the item never reaches the KDS.
async function stationsForItem(itemId) {
  const [rows] = await pool.query(
    `SELECT agpc.production_center_id AS id
     FROM items i
     JOIN accounting_groups ag ON ag.name = i.accounting_group
     JOIN accounting_group_production_centers agpc ON agpc.accounting_group_id = ag.id
     WHERE i.id = ?`,
    [itemId],
  )
  return rows.map((r) => r.id)
}

async function buildOrderNumber(connection) {
  const [rows] = await connection.query(
    `SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS d,
            (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(order_number, '-', -1) AS UNSIGNED)), 0)
             FROM pos_orders WHERE DATE(created_at) = CURDATE()) AS n`,
  )
  const { d, n } = rows[0]
  return `ORD-${d}-${String(Number(n) + 1).padStart(4, '0')}`
}

function mapItem(row) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
    lineTotal: Number(row.line_total),
    courseId: row.course_id,
    seatNumber: row.seat_number === null ? null : Number(row.seat_number),
    productionCenterId: row.production_center_id,
    kdsStatus: row.kds_status,
    firedAt: row.fired_at,
    preparingAt: row.preparing_at,
    readyAt: row.ready_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

async function attachDetail(orders) {
  if (orders.length === 0) return
  const ids = orders.map((o) => o.id)
  const placeholders = ids.map(() => '?').join(', ')
  const [courseRows] = await pool.query(
    `SELECT * FROM order_courses WHERE order_id IN (${placeholders}) ORDER BY course_number ASC`,
    ids,
  )
  const [itemRows] = await pool.query(
    `SELECT * FROM pos_order_items WHERE order_id IN (${placeholders}) AND is_station_copy = 0 ORDER BY id ASC`,
    ids,
  )
  const coursesByOrder = new Map()
  for (const c of courseRows) {
    if (!coursesByOrder.has(c.order_id)) coursesByOrder.set(c.order_id, [])
    coursesByOrder.get(c.order_id).push({
      id: c.id,
      orderId: c.order_id,
      courseNumber: Number(c.course_number),
      name: c.name,
      firedAt: c.fired_at,
      status: c.status,
      items: [],
    })
  }
  for (const row of itemRows) {
    const item = mapItem(row)
    if (row.course_id) {
      const course = coursesByOrder.get(row.order_id)?.find((c) => c.id === row.course_id)
      if (course) course.items.push(item)
    } else {
      if (!orders._unassigned) orders._unassigned = new Map()
      if (!orders._unassigned.has(row.order_id)) orders._unassigned.set(row.order_id, [])
      orders._unassigned.get(row.order_id).push(item)
    }
  }
  for (const order of orders) {
    order.courses = coursesByOrder.get(order.id) ?? []
    order.unassignedItems = orders._unassigned?.get(order.id) ?? []
    // Sanity: enforce uniqueness of primary key column ids ordering later in UI.
  }
}

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE o.id = ?`, [id])
  const order = mapOrder(rows[0])
  if (!order) return null
  await attachDetail([order])
  delete order._unassigned
  return order
}

async function recomputeTotals(conn, orderId) {
  const [rows] = await conn.query(
    `SELECT COALESCE(SUM(line_total), 0) AS subtotal
     FROM pos_order_items
     WHERE order_id = ? AND is_station_copy = 0 AND kds_status != 'cancelled'`,
    [orderId],
  )
  await conn.query('UPDATE pos_orders SET subtotal = ?, updated_at = NOW() WHERE id = ?', [rows[0].subtotal, orderId])
}

async function ensureFirstCourse(conn, orderId) {
  const [rows] = await conn.query(
    'SELECT id FROM order_courses WHERE order_id = ? ORDER BY course_number ASC LIMIT 1',
    [orderId],
  )
  if (rows.length) return rows[0].id
  const [r] = await conn.query(
    "INSERT INTO order_courses (order_id, course_number, name) VALUES (?, 1, 'Course 1')",
    [orderId],
  )
  return r.insertId
}

async function requireOpenOrder(conn, orderId) {
  const [rows] = await conn.query('SELECT id, status, order_type, table_session_id, order_number FROM pos_orders WHERE id = ?', [
    orderId,
  ])
  if (!rows.length) throw httpError('Order not found', 404)
  if (rows[0].status !== 'open') throw httpError('Order is already closed', 409)
  return rows[0]
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

async function createOpen({
  outletId,
  deviceId,
  staffId,
  salePeriodId,
  tableSessionId,
  orderType = 'dine_in',
  collectionCode,
  covers,
  customerId,
}) {
  if (tableSessionId) {
    const session = await tableSessionModel.findById(tableSessionId)
    if (!session || session.status !== 'open') throw httpError('Table session is not open', 409)
    if (session.outletId !== outletId) throw httpError('Table belongs to another outlet', 409)
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    let orderId = null
    let orderNumber = null
    for (let attempt = 0; attempt < 3 && !orderId; attempt++) {
      orderNumber = await buildOrderNumber(conn)
      const code =
        collectionCode || null
      try {
        const [result] = await conn.query(
          `INSERT INTO pos_orders
             (order_number, outlet_id, device_id, staff_id, sale_period_id, customer_id, table_session_id,
              status, order_type, collection_code, covers)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
          [
            orderNumber,
            outletId,
            deviceId || null,
            staffId || null,
            salePeriodId || null,
            customerId || null,
            tableSessionId || null,
            orderType,
            orderType === 'dine_in' ? null : code || generateCollectionCode(),
            covers === undefined || covers === null ? null : Number(covers),
          ],
        )
        orderId = result.insertId
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error
      }
    }
    if (!orderId) throw httpError('Could not generate a unique order number', 500)
    await ensureFirstCourse(conn, orderId)
    await conn.commit()
    return findById(orderId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

function generateCollectionCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

async function updateOrder(
  orderId,
  { covers, customerId, collectionCode, orderType } = {},
) {
  const [orderRows] = await pool.query('SELECT covers, collection_code, order_type, status FROM pos_orders WHERE id = ?', [orderId])
  if (!orderRows.length) throw httpError('Order not found', 404)
  if (orderRows[0].status !== 'open') throw httpError('Order is already closed', 409)
  const order = orderRows[0]
  await pool.query(
    `UPDATE pos_orders
     SET covers = ?, customer_id = ?, collection_code = ?, order_type = ?
     WHERE id = ?`,
    [
      covers === undefined || covers === null ? order.covers : Number(covers),
      customerId === undefined ? order.customer_id : customerId || null,
      collectionCode === undefined ? order.collection_code : collectionCode || null,
      orderType || order.order_type,
      orderId,
    ],
  )
  return findById(orderId)
}

// Add lines to the order, attached to a course (first course if none given) and
// optionally a seat. Items are not routed to the kitchen until the course fires.
async function addItems(orderId, lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw httpError('Order must contain at least one item', 400)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await requireOpenOrder(conn, orderId)

    let courseId = null
    const first = lines.find((l) => l.courseId)
    if (first?.courseId) {
      const [courseRows] = await conn.query(
        'SELECT id FROM order_courses WHERE id = ? AND order_id = ?',
        [first.courseId, orderId],
      )
      if (!courseRows.length) throw httpError('Course does not belong to this order', 400)
      courseId = first.courseId
    } else {
      courseId = await ensureFirstCourse(conn, orderId)
    }

    for (const line of lines) {
      const itemId = Number(line.itemId)
      const qty = Number(line.quantity)
      if (!itemId || !qty || qty <= 0) throw httpError('Invalid item or quantity', 400)
      const [itemRows] = await conn.query('SELECT id, name FROM items WHERE id = ?', [itemId])
      if (!itemRows.length) throw httpError(`Item ${itemId} not found`, 400)
      const unitPrice = (await findItemPrice(itemId)) ?? 0
      const lineTotal = Math.round(unitPrice * qty * 100) / 100
      const seatNumber = line.seatNumber === undefined || line.seatNumber === null || line.seatNumber === '' ? null : Number(line.seatNumber)
      await conn.query(
        `INSERT INTO pos_order_items (order_id, item_id, item_name, unit_price, quantity, line_total, course_id, seat_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, itemId, itemRows[0].name, unitPrice, qty, lineTotal, courseId, seatNumber],
      )
    }
    await recomputeTotals(conn, orderId)
    await conn.commit()
    return findById(orderId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function findCanonicalItem(conn, orderId, itemId) {
  const [rows] = await conn.query(
    `SELECT * FROM pos_order_items WHERE id = ? AND order_id = ? AND is_station_copy = 0`,
    [itemId, orderId],
  )
  if (!rows.length) throw httpError('Order item not found', 404)
  return rows[0]
}

async function removeItem(orderId, itemId) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await requireOpenOrder(conn, orderId)
    const item = await findCanonicalItem(conn, orderId, itemId)
    if (item.fired_at) throw httpError('Item already fired; use Refund instead', 409)
    await conn.query(
      `DELETE FROM pos_order_items
       WHERE id = ? OR (order_id = ? AND item_id = ? AND course_id = ? AND seat_number = ? AND is_station_copy = 1)`,
      [item.id, orderId, item.item_id, item.course_id, item.seat_number],
    )
    await recomputeTotals(conn, orderId)
    await conn.commit()
    return findById(orderId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// Refund = cancel the line (and any station copies) so it is excluded from
// totals and shown as cancelled on the KDS. Works whether fired or not.
async function refundItem(orderId, itemId) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await requireOpenOrder(conn, orderId)
    const item = await findCanonicalItem(conn, orderId, itemId)
    await conn.query(
      `UPDATE pos_order_items SET kds_status = 'cancelled', completed_at = NOW() WHERE id = ?
       OR (order_id = ? AND item_id = ? AND course_id = ? AND seat_number = ? AND is_station_copy = 1)`,
      [item.id, orderId, item.item_id, item.course_id, item.seat_number],
    )
    await recomputeTotals(conn, orderId)
    await conn.commit()
    return findById(orderId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// Move a line between courses and/or seats. courseId null + beforeFirstCourse
// moves the item out of every course (unassigned, like "before first course").
async function moveItem(orderId, itemId, { courseId, seatNumber, beforeFirstCourse } = {}) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await requireOpenOrder(conn, orderId)
    const item = await findCanonicalItem(conn, orderId, itemId)
    let newCourseId = item.course_id
    if (beforeFirstCourse) {
      newCourseId = null
    } else if (courseId !== undefined) {
      if (!courseId) {
        newCourseId = null
      } else {
        const [courseRows] = await conn.query('SELECT id FROM order_courses WHERE id = ? AND order_id = ?', [
          courseId,
          orderId,
        ])
        if (!courseRows.length) throw httpError('Course does not belong to this order', 400)
        newCourseId = courseId
      }
    }
    const newSeat = seatNumber === undefined || seatNumber === null || seatNumber === ''
      ? item.seat_number
      : Number(seatNumber)
    await conn.query(
      `UPDATE pos_order_items SET course_id = ?, seat_number = ? WHERE id = ?`,
      [newCourseId, newSeat, item.id],
    )
    await conn.query(
      `UPDATE pos_order_items SET course_id = ?, seat_number = ? WHERE order_id = ? AND item_id = ? AND is_station_copy = 1`,
      [newCourseId, newSeat, orderId, item.item_id],
    )
    await recomputeTotals(conn, orderId)
    await conn.commit()
    return findById(orderId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

// Split check: one new open order per distinct seat (beyond the first), sharing
// the same table session. Shared (unassigned-seat) items stay on the original.
async function splitCheck(orderId) {
  const order = await findById(orderId)
  if (!order) throw httpError('Order not found', 404)
  if (order.status !== 'open') throw httpError('Order is already closed', 409)
  const seats = [...new Set(order.courses.flatMap((c) => c.items.map((i) => i.seatNumber).filter((s) => s !== null)))].sort(
    (a, b) => a - b,
  )
  if (seats.length < 2) throw httpError('This order has only one seat; nothing to split', 409)

  const conn = await pool.getConnection()
  const created = []
  try {
    await conn.beginTransaction()
    for (const seat of seats.slice(1)) {
      let newId = null
      for (let attempt = 0; attempt < 3 && !newId; attempt++) {
        const orderNumber = await buildOrderNumber(conn)
        try {
          const [result] = await conn.query(
            `INSERT INTO pos_orders
               (order_number, outlet_id, device_id, staff_id, sale_period_id, customer_id, table_session_id,
                status, order_type, collection_code, covers)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 'dine_in', NULL, ?)`,
            [
              orderNumber,
              order.outletId,
              order.deviceId,
              order.staffId,
              order.salePeriodId,
              order.customerId,
              order.tableSessionId,
              order.covers,
            ],
          )
          newId = result.insertId
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') throw error
        }
      }
      if (!newId) throw httpError('Could not generate a unique order number', 500)
      const [courseResult] = await conn.query(
        "INSERT INTO order_courses (order_id, course_number, name) VALUES (?, 1, 'Course 1')",
        [newId],
      )
      await conn.query(
        `UPDATE pos_order_items SET order_id = ?, course_id = ? WHERE order_id = ? AND seat_number = ?`,
        [newId, courseResult.insertId, orderId, seat],
      )
      await recomputeTotals(conn, newId)
      created.push(newId)
    }
    await recomputeTotals(conn, orderId)
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
  return Promise.all([findById(orderId), ...created.map((id) => findById(id))])
}

// Pay an open order: recompute totals from canonical lines, record the payment,
// close the table session for dine-in, and write 'sale' stock movements OUT.
async function checkout(orderId, { paymentMethod, paymentReceived, discount, tip, notes, folioId } = {}) {
  const order = await findById(orderId)
  if (!order) throw httpError('Order not found', 404)
  if (order.status !== 'open') throw httpError('Order is already closed', 409)
  if (paymentMethod === 'room_charge') {
    if (!folioId) throw httpError('A folio is required for room charge payment', 400)
    const [folioRows] = await pool.query(`SELECT id, status FROM folios WHERE id = ?`, [Number(folioId)])
    if (!folioRows.length || folioRows[0].status !== 'open') {
      throw httpError('Folio is not open', 400)
    }
  }

  const subtotal = order.subtotal
  const disc = Math.round(Math.min(Math.max(Number(discount) || 0, 0), subtotal) * 100) / 100
  const tipN = Math.round(Math.max(Number(tip) || 0, 0) * 100) / 100
  const total = Math.round((subtotal - disc) * 100) / 100 + tipN
  const received =
    paymentReceived === null || paymentReceived === undefined || paymentReceived === ''
      ? null
      : Number(paymentReceived)
  const change = received !== null ? Math.round((received - total) * 100) / 100 : null
  if (change !== null && change < 0) throw httpError('Payment received is less than total', 400)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      `UPDATE pos_orders
       SET status = 'paid', completed_at = NOW(), subtotal = ?, discount = ?, tax = 0, tip = ?,
           total = ?, payment_method = ?, payment_received = ?, change_due = ?, updated_at = NOW()
       WHERE id = ?`,
      [subtotal, disc, tipN, total, paymentMethod || null, received, change, orderId],
    )
    const [lineRows] = await conn.query(
      `SELECT poi.item_id, poi.quantity, poi.item_name, poi.production_center_id
       FROM pos_order_items poi
       WHERE poi.order_id = ? AND poi.is_station_copy = 0 AND poi.kds_status != 'cancelled'`,
      [orderId],
    )
    for (const line of lineRows) {
      const cost = (await priceModel.getCurrentPrice(line.item_id))?.costPrice ?? 0
      let locationId = null
      if (line.production_center_id) {
        const [pcRows] = await conn.query('SELECT location_id FROM production_centers WHERE id = ?', [
          line.production_center_id,
        ])
        locationId = pcRows[0]?.location_id || null
      }
      await conn.query(
        `INSERT INTO stock_movements (item_id, direction, qty, unit_cost, type, reason, staff, location_id, reference)
         VALUES (?, 'OUT', ?, ?, 'sale', ?, ?, ?, ?)`,
        [
          line.item_id,
          line.quantity,
          cost,
          `Sale ${order.orderNumber}`,
          order.staffName || null,
          locationId,
          order.orderNumber,
        ],
      )
    }
    if (paymentMethod === 'room_charge') {
      await conn.query(
        `INSERT INTO folio_line_items (folio_id, type, description, amount, source_order_id, staff_id)
         VALUES (?, 'pos_charge', ?, ?, ?, ?)`,
        [Number(folioId), `Restaurant - ${order.orderNumber}`, total, Number(orderId), order.staffId || null],
      )
      await conn.query(
        'UPDATE folios SET balance = (SELECT COALESCE(SUM(amount), 0) FROM folio_line_items WHERE folio_id = ?) WHERE id = ?',
        [Number(folioId), Number(folioId)],
      )
    }
    await conn.commit()
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }

  if (order.orderType === 'dine_in' && order.tableSessionId) {
    await tableSessionModel.close(order.tableSessionId)
  }
  return findById(orderId)
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function listByOutlet(outletId, { date, periodId, status, orderType, search, limit = 50 } = {}) {
  const conditions = ['o.outlet_id = ?']
  const params = [outletId]
  if (periodId) {
    conditions.push('o.sale_period_id = ?')
    params.push(Number(periodId))
  }
  if (date) {
    if (date === 'today') {
      conditions.push('DATE(o.created_at) = CURDATE()')
    } else {
      conditions.push('DATE(o.created_at) = DATE(?)')
      params.push(date)
    }
  }
  if (status) {
    if (Array.isArray(status)) {
      conditions.push(`o.status IN (${status.map(() => '?').join(', ')})`)
      params.push(...status)
    } else {
      conditions.push('o.status = ?')
      params.push(status)
    }
  }
  if (orderType) {
    conditions.push('o.order_type = ?')
    params.push(orderType)
  }
  if (search) {
    conditions.push(`(o.order_number LIKE ? OR o.collection_code LIKE ? OR t.label LIKE ?
                     OR CONCAT_WS(' ', s.first_name, s.last_name) LIKE ?)`)
    const q = `%${search}%`
    params.push(q, q, q, q)
  }
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.updated_at DESC, o.id DESC LIMIT ?`,
    [...params, Math.min(Number(limit) || 50, 200)],
  )
  const orders = rows.map(mapOrder)
  await attachDetail(orders)
  for (const order of orders) delete order._unassigned
  return orders
}

// Quick operational counters for dashboards (all outlets, backoffice).
async function getStats() {
  const [[{ openOrders }]] = await pool.query("SELECT COUNT(*) AS openOrders FROM pos_orders WHERE status = 'open'")
  const [[{ ordersToday }]] = await pool.query(
    'SELECT COUNT(*) AS ordersToday FROM pos_orders WHERE DATE(created_at) = CURDATE()',
  )
  const [[{ revenueToday }]] = await pool.query(
    `SELECT COALESCE(SUM(total + IFNULL(tip, 0)), 0) AS revenueToday
     FROM pos_orders WHERE status = 'paid' AND DATE(created_at) = CURDATE()`,
  )
  const [[{ openTables }]] = await pool.query(
    "SELECT COUNT(*) AS openTables FROM table_sessions WHERE status = 'open'",
  )
  const [[{ kitchenActive }]] = await pool.query(
    `SELECT COUNT(*) AS kitchenActive FROM pos_order_items
     WHERE is_station_copy = 0 AND kds_status IN ('new', 'preparing', 'ready')`,
  )
  const [[{ floorPlans }]] = await pool.query('SELECT COUNT(*) AS floorPlans FROM floor_plans')
  const [tables] = await pool.query('SELECT COUNT(*) AS total FROM restaurant_tables')
  return {
    openOrders: Number(openOrders),
    ordersToday: Number(ordersToday),
    revenueToday: Number(revenueToday),
    openTables: Number(openTables),
    kitchenActive: Number(kitchenActive),
    floorPlans: Number(floorPlans),
    restaurantTables: Number(tables[0]?.total || 0),
  }
}

module.exports = {
  createOpen,
  updateOrder,
  addItems,
  removeItem,
  refundItem,
  moveItem,
  splitCheck,
  checkout,
  findById,
  listByOutlet,
  stationsForItem,
  getStats,
}
