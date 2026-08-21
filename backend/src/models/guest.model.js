const crypto = require('crypto')
const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')
const { sendMail } = require('../utils/mailer')

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

async function lookupByRoom(roomNumber) {
  if (!roomNumber) throw httpError('Room number is required', 400)
  const [rows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.room_id, rv.room_type_id, rv.rate_plan_id,
            DATE_FORMAT(rv.check_in_date, '%Y-%m-%dT%H:%i') AS check_in_date,
            DATE_FORMAT(rv.check_out_date, '%Y-%m-%dT%H:%i') AS check_out_date,
            rv.status, rv.adults, rv.children,
            c.first_name, c.last_name, c.email, c.phone,
            r.room_number,
            rt.name AS room_type_name,
            rp.name AS rate_plan_name
     FROM reservations rv
     JOIN customers c ON c.id = rv.customer_id
     JOIN rooms r ON r.id = rv.room_id
     LEFT JOIN room_types rt ON rt.id = rv.room_type_id
     LEFT JOIN rate_plans rp ON rp.id = rv.rate_plan_id
     WHERE r.room_number = ? AND rv.status IN ('booked', 'checked_in')
     ORDER BY rv.check_in_date DESC
     LIMIT 1`,
    [roomNumber],
  )
  if (!rows.length) throw httpError('No active reservation found for this room', 404)
  return rows[0]
}

async function requestOtp(reservationId) {
  const [rows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.email, rv.guest_name FROM (
       SELECT rv.id, rv.customer_id, c.email, CONCAT_WS(' ', c.first_name, c.last_name) AS guest_name
       FROM reservations rv
       JOIN customers c ON c.id = rv.customer_id
       WHERE rv.id = ?
     ) rv
     WHERE rv.email IS NOT NULL AND rv.email != ''`,
    [reservationId],
  )
  if (!rows.length) throw httpError('No email found for this reservation', 404)

  const reservation = rows[0]
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await pool.query(
    `INSERT INTO guest_otps (reservation_id, email, code, expires_at) VALUES (?, ?, ?, ?)`,
    [reservationId, reservation.email, code, expiresAt],
  )

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #166534; text-align: center;">Resort Guest Portal</h2>
      <p>Hello <strong>${reservation.guest_name}</strong>,</p>
      <p>Your verification code is:</p>
      <div style="text-align: center; padding: 20px; margin: 20px 0; background: #f1f5f9; border-radius: 10px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #166534;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `

  const result = await sendMail({
    to: reservation.email,
    subject: 'Your Resort Verification Code',
    html,
  })

  return {
    email: reservation.email,
    sent: result.sent,
    reason: result.reason,
    code: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

async function verifyOtp(reservationId, code) {
  if (!code) throw httpError('Verification code is required', 400)

  const [rows] = await pool.query(
    `SELECT id FROM guest_otps
     WHERE reservation_id = ? AND code = ? AND verified = 0 AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [reservationId, code],
  )
  if (!rows.length) throw httpError('Invalid or expired verification code', 401)

  await pool.query('UPDATE guest_otps SET verified = 1 WHERE id = ?', [rows[0].id])

  return { verified: true }
}

async function guestDashboard(reservationId) {
  const [rows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.room_id, rv.room_type_id, rv.rate_plan_id,
            DATE_FORMAT(rv.check_in_date, '%Y-%m-%dT%H:%i') AS check_in_date,
            DATE_FORMAT(rv.check_out_date, '%Y-%m-%dT%H:%i') AS check_out_date,
            rv.status, rv.adults, rv.children, rv.source, rv.notes,
            rv.created_at, rv.updated_at,
            c.first_name, c.last_name, c.email, c.phone,
            r.room_number, r.floor,
            rt.name AS room_type_name, rt.base_rate,
            rp.name AS rate_plan_name
     FROM reservations rv
     JOIN customers c ON c.id = rv.customer_id
     LEFT JOIN rooms r ON r.id = rv.room_id
     LEFT JOIN room_types rt ON rt.id = rv.room_type_id
     LEFT JOIN rate_plans rp ON rp.id = rv.rate_plan_id
     WHERE rv.id = ?`,
    [reservationId],
  )
  if (!rows.length) throw httpError('Reservation not found', 404)

  const r = rows[0]
  const ms = new Date(r.check_out_date) - new Date(r.check_in_date)
  const nights = Math.max(0, Math.round((ms / 86400000) * 100) / 100)

  let folio = null
  const [folioRows] = await pool.query(
    `SELECT f.id, f.status, f.balance
     FROM folios f
     WHERE f.reservation_id = ? ORDER BY f.id DESC LIMIT 1`,
    [reservationId],
  )
  if (folioRows.length) {
    folio = folioRows[0]
    const [lines] = await pool.query(
      `SELECT fl.id, fl.type, fl.description, fl.amount, fl.created_at
       FROM folio_line_items fl
       WHERE fl.folio_id = ?
       ORDER BY fl.created_at ASC`,
      [folio.id],
    )
    folio.lines = lines
  }

  return {
    id: r.id,
    guestName: `${r.first_name} ${r.last_name}`.trim(),
    email: r.email,
    phone: r.phone,
    roomNumber: r.room_number,
    floor: r.floor,
    roomType: r.room_type_name,
    ratePlan: r.rate_plan_name,
    checkInDate: r.check_in_date,
    checkOutDate: r.check_out_date,
    nights,
    adults: Number(r.adults),
    children: Number(r.children),
    status: r.status,
    source: r.source,
    notes: r.notes,
    baseRate: Number(r.base_rate),
    createdAt: r.created_at,
    folio,
  }
}

async function guestMenu(reservationId) {
  const [menus] = await pool.query(
    `SELECT m.id, m.name, m.description
     FROM menus m
     WHERE m.is_active = 1
     ORDER BY m.name ASC`,
  )
  if (!menus.length) return []

  for (const menu of menus) {
    const [screens] = await pool.query(
      `SELECT ms.id, ms.name
       FROM menu_screens ms
       WHERE ms.menu_id = ?
       ORDER BY ms.sort_order ASC, ms.id ASC`,
      [menu.id],
    )
    menu.screens = screens
    if (screens.length) {
      const screenIds = screens.map((s) => s.id)
      const placeholders = screenIds.map(() => '?').join(', ')
      const [items] = await pool.query(
        `SELECT msi.menu_screen_id, i.id AS item_id, i.name AS item_name, i.description,
                i.image, mp.price AS item_price
         FROM menu_screen_items msi
         JOIN items i ON i.id = msi.item_id
         LEFT JOIN price_lists pl ON pl.is_default = 1
         LEFT JOIN menu_prices mp ON mp.item_id = msi.item_id AND mp.price_list_id = pl.id
         WHERE msi.menu_screen_id IN (${placeholders})
         ORDER BY msi.sort_order ASC, i.name ASC`,
        screenIds,
      )
      const itemsByScreen = new Map()
      for (const item of items) {
        if (!itemsByScreen.has(item.menu_screen_id)) itemsByScreen.set(item.menu_screen_id, [])
        itemsByScreen.get(item.menu_screen_id).push({
          itemId: item.item_id,
          name: item.item_name,
          description: item.description,
          image: item.image,
          price: item.item_price === null ? null : Number(item.item_price),
        })
      }
      for (const screen of screens) {
        screen.items = itemsByScreen.get(screen.id) ?? []
      }
    }
  }
  return menus
}

async function createGuestOrder(reservationId, { items, notes }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError('Order must contain at least one item', 400)
  }

  const [resRows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.room_id
     FROM reservations rv
     WHERE rv.id = ? AND rv.status IN ('booked', 'checked_in')`,
    [reservationId],
  )
  if (!resRows.length) throw httpError('Reservation not found or not active', 404)
  const reservation = resRows[0]

  const [folioRows] = await pool.query(
    `SELECT id FROM folios WHERE reservation_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
    [reservationId],
  )
  let folioId
  if (folioRows.length) {
    folioId = folioRows[0].id
  } else {
    const [newFolio] = await pool.query(
      'INSERT INTO folios (reservation_id, customer_id, room_id, status) VALUES (?, ?, ?, ?)',
      [reservationId, reservation.customer_id, reservation.room_id, 'open'],
    )
    folioId = newFolio.insertId
  }

  const [outletRows] = await pool.query('SELECT id FROM outlets ORDER BY id ASC LIMIT 1')
  const outletId = outletRows[0]?.id
  if (!outletId) throw httpError('No outlet configured', 500)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [dateRow] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y%m%d') AS d")
    const d = dateRow[0].d
    const [maxRow] = await conn.query(
      "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(order_number, '-', -1) AS UNSIGNED)), 0) AS n FROM pos_orders WHERE DATE(created_at) = CURDATE()",
    )
    const orderNumber = `ORD-${d}-${String(Number(maxRow[0].n) + 1).padStart(4, '0')}`

    const [orderResult] = await conn.query(
      `INSERT INTO pos_orders
         (order_number, outlet_id, customer_id, status, order_type, covers, notes)
       VALUES (?, ?, ?, 'open', 'room_charge', 1, ?)`,
      [orderNumber, outletId, reservation.customer_id, notes || null],
    )
    const orderId = orderResult.insertId

    const [courseResult] = await conn.query(
      "INSERT INTO order_courses (order_id, course_number, name) VALUES (?, 1, 'Room Service')",
      [orderId],
    )
    const courseId = courseResult.insertId

    let subtotal = 0
    for (const item of items) {
      const itemId = Number(item.itemId)
      const qty = Number(item.quantity) || 1
      if (!itemId) throw httpError('Invalid item', 400)

      const [itemRows] = await conn.query('SELECT id, name FROM items WHERE id = ?', [itemId])
      if (!itemRows.length) throw httpError(`Item ${itemId} not found`, 400)

      const [priceRows] = await conn.query(
        `SELECT mp.price FROM menu_prices mp
         JOIN price_lists pl ON pl.id = mp.price_list_id
         WHERE mp.item_id = ? AND pl.is_default = 1 LIMIT 1`,
        [itemId],
      )
      const unitPrice = priceRows[0] ? Number(priceRows[0].price) : 0
      const lineTotal = Math.round(unitPrice * qty * 100) / 100
      subtotal += lineTotal

      await conn.query(
        `INSERT INTO pos_order_items (order_id, item_id, item_name, unit_price, quantity, line_total, course_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, itemId, itemRows[0].name, unitPrice, qty, lineTotal, courseId],
      )
    }

    await conn.query('UPDATE pos_orders SET subtotal = ?, total = ? WHERE id = ?', [subtotal, subtotal, orderId])

    await conn.query(
      `INSERT INTO folio_line_items (folio_id, type, description, amount, source_order_id)
       VALUES (?, 'pos_charge', ?, ?, ?)`,
      [folioId, `Room Service - ${orderNumber}`, subtotal, orderId],
    )
    await conn.query(
      'UPDATE folios SET balance = (SELECT COALESCE(SUM(amount), 0) FROM folio_line_items WHERE folio_id = ?) WHERE id = ?',
      [folioId, folioId],
    )

    await conn.query(
      "UPDATE pos_orders SET status = 'paid', payment_method = 'room_charge', completed_at = NOW() WHERE id = ?",
      [orderId],
    )

    await conn.commit()

    const [resultRows] = await conn.query(
      `SELECT o.id, o.order_number, o.status, o.subtotal, o.total, o.created_at
       FROM pos_orders o WHERE o.id = ?`,
      [orderId],
    )
    return {
      orderId: resultRows[0].id,
      orderNumber: resultRows[0].order_number,
      status: resultRows[0].status,
      total: Number(resultRows[0].total),
      createdAt: resultRows[0].created_at,
    }
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function guestOrders(reservationId) {
  const [rows] = await pool.query(
    `SELECT o.id, o.order_number, o.status, o.subtotal, o.total, o.payment_method,
            o.created_at, o.completed_at
     FROM pos_orders o
     WHERE o.customer_id = (SELECT customer_id FROM reservations WHERE id = ?)
       AND o.order_type = 'room_charge'
     ORDER BY o.created_at DESC
     LIMIT 20`,
    [reservationId],
  )

  const orders = rows.map((r) => ({
    id: r.id,
    orderNumber: r.order_number,
    status: r.status,
    subtotal: Number(r.subtotal),
    total: Number(r.total),
    paymentMethod: r.payment_method,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  }))

  if (orders.length) {
    const ids = orders.map((o) => o.id)
    const placeholders = ids.map(() => '?').join(', ')
    const [itemRows] = await pool.query(
      `SELECT order_id, item_name, quantity, unit_price, line_total
       FROM pos_order_items
       WHERE order_id IN (${placeholders}) AND is_station_copy = 0
       ORDER BY id ASC`,
      ids,
    )
    const itemsByOrder = new Map()
    for (const row of itemRows) {
      if (!itemsByOrder.has(row.order_id)) itemsByOrder.set(row.order_id, [])
      itemsByOrder.get(row.order_id).push({
        name: row.item_name,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        lineTotal: Number(row.line_total),
      })
    }
    for (const order of orders) {
      order.items = itemsByOrder.get(order.id) ?? []
    }
  }

  return orders
}

async function guestOutlets() {
  const [rows] = await pool.query(
    `SELECT id, name, type FROM outlets WHERE is_active = 1 ORDER BY name ASC`,
  )
  return rows
}

module.exports = { lookupByRoom, requestOtp, verifyOtp, guestDashboard, guestMenu, createGuestOrder, guestOrders, guestOutlets }
