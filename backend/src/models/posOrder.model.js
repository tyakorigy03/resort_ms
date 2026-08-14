const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

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
    status: row.status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    tax: Number(row.tax),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    paymentReceived: row.payment_received === null ? null : Number(row.payment_received),
    changeDue: row.change_due === null ? null : Number(row.change_due),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    items: row.items || [],
  }
}

const BASE_SELECT = `
  SELECT o.id, o.order_number, o.outlet_id, o.device_id, o.staff_id, o.sale_period_id, o.status,
         o.subtotal, o.discount, o.tax, o.total, o.payment_method, o.payment_received, o.change_due,
         o.created_at, o.completed_at,
         CONCAT_WS(' ', s.first_name, s.last_name) AS staff_name
  FROM pos_orders o
  LEFT JOIN staff s ON s.id = o.staff_id`

async function attachItems(orders) {
  if (orders.length === 0) return
  const ids = orders.map((o) => o.id)
  const placeholders = ids.map(() => '?').join(', ')
  const [rows] = await pool.query(
    `SELECT order_id, id, item_id, item_name, unit_price, quantity, line_total
     FROM pos_order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
    ids,
  )
  const byOrder = new Map()
  for (const row of rows) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, [])
    byOrder.get(row.order_id).push({
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      unitPrice: Number(row.unit_price),
      quantity: Number(row.quantity),
      lineTotal: Number(row.line_total),
    })
  }
  for (const order of orders) {
    order.items = byOrder.get(order.id) ?? []
  }
}

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE o.id = ?`, [id])
  const order = mapOrder(rows[0])
  if (!order) return null
  await attachItems([order])
  return order
}

async function findItemPrice(itemId) {
  const [rows] = await pool.query(
    `SELECT mp.price FROM menu_prices mp
     JOIN price_lists pl ON pl.id = mp.price_list_id
     WHERE mp.item_id = ? ORDER BY pl.is_default DESC, mp.id ASC LIMIT 1`,
    [itemId],
  )
  return rows[0] ? Number(rows[0].price) : null
}

async function buildOrderNumber(connection) {
  const [rows] = await connection.query(
    `SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS d,
            (SELECT COUNT(*) FROM pos_orders WHERE DATE(created_at) = CURDATE()) AS n`,
  )
  const { d, n } = rows[0]
  return `ORD-${d}-${String(Number(n) + 1).padStart(4, '0')}`
}

async function create({ outletId, deviceId, staffId, salePeriodId, items = [], discount = 0, paymentMethod, paymentReceived }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError('Order must contain at least one item', 400)
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const lines = []
    let subtotal = 0
    for (const line of items) {
      const itemId = Number(line.itemId)
      const qty = Number(line.quantity)
      if (!itemId || !qty || qty <= 0) throw httpError('Invalid item or quantity', 400)
      const [itemRows] = await connection.query('SELECT id, name FROM items WHERE id = ?', [itemId])
      if (!itemRows.length) throw httpError(`Item ${itemId} not found`, 400)
      const unitPrice = await findItemPrice(itemId)
      const price = unitPrice ?? 0
      const lineTotal = Math.round(price * qty * 100) / 100
      subtotal += lineTotal
      lines.push({ itemId, itemName: itemRows[0].name, unitPrice: price, quantity: qty, lineTotal })
    }
    subtotal = Math.round(subtotal * 100) / 100
    const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
    const total = Math.round((subtotal - disc) * 100) / 100
    const received = paymentReceived === null || paymentReceived === undefined || paymentReceived === '' ? null : Number(paymentReceived)
    const change = received !== null ? Math.round((received - total) * 100) / 100 : null
    if (change !== null && change < 0) throw httpError('Payment received is less than total', 400)

    let orderId = null
    let orderNumber = null
    for (let attempt = 0; attempt < 3 && !orderId; attempt++) {
      orderNumber = await buildOrderNumber(connection)
      try {
        const [result] = await connection.query(
          `INSERT INTO pos_orders
             (order_number, outlet_id, device_id, staff_id, sale_period_id, status, subtotal, discount, tax, total,
              payment_method, payment_received, change_due, completed_at)
           VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, 0, ?, ?, ?, ?, NOW())`,
          [orderNumber, outletId, deviceId || null, staffId || null, salePeriodId || null, subtotal, disc, total, paymentMethod || null, received, change],
        )
        orderId = result.insertId
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error
      }
    }
    if (!orderId) throw httpError('Could not generate a unique order number', 500)

    for (const line of lines) {
      await connection.query(
        'INSERT INTO pos_order_items (order_id, item_id, item_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, line.itemId, line.itemName, line.unitPrice, line.quantity, line.lineTotal],
      )
    }
    await connection.commit()
    const order = await findById(orderId)
    return order
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function listByOutlet(outletId, { date, periodId, limit = 50 } = {}) {
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
  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY o.id DESC LIMIT ?`,
    [...params, Math.min(Number(limit) || 50, 200)],
  )
  const orders = rows.map(mapOrder)
  await attachItems(orders)
  return orders
}

module.exports = { create, findById, listByOutlet }
