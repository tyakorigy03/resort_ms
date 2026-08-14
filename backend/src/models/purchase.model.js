const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')
const { sendMail, buildPurchaseEmail } = require('../utils/mailer')

function round2(n) {
  return Math.round(n * 100) / 100
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// mysql2 parses DATE columns into JS Dates in local time; toISOString() would
// shift the day in non-UTC timezones, so format the local date parts directly.
function dateStr(value) {
  const d = value instanceof Date ? value : new Date(value)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function mapItem(row) {
  const qty = Number(row.qty)
  const unitCost = Number(row.unit_cost)
  const receivedQty = row.received_qty == null ? null : Number(row.received_qty)
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.name,
    sku: row.sku,
    unit: row.unit,
    qty,
    receivedQty,
    unitCost,
    value: round2(qty * unitCost),
    receivedValue: receivedQty == null ? null : round2(receivedQty * unitCost),
  }
}

function mapPurchase(row, items, attachments = []) {
  const allNull = items.every((it) => it.receivedQty == null)
  return {
    id: row.id,
    date: row.purchase_date,
    poNumber: row.po_number,
    supplierId: row.supplier_id ? Number(row.supplier_id) : null,
    supplierName: row.supplier_name || null,
    supplierEmail: row.supplier_email || null,
    staff: row.staff,
    locationId: row.location_id ? Number(row.location_id) : null,
    locationName: row.location_name || null,
    notes: row.notes,
    status: row.status,
    sentAt: row.sent_at,
    sentToEmail: row.sent_to_email,
    receivedAt: row.received_at,
    receiveNote: row.receive_note,
    createdAt: row.created_at,
    itemCount: items.length,
    items,
    attachments,
    totalQty: round2(items.reduce((sum, it) => sum + it.qty, 0)),
    totalValue: round2(items.reduce((sum, it) => sum + it.value, 0)),
    receivedQty: allNull ? null : round2(items.reduce((sum, it) => sum + (it.receivedQty || 0), 0)),
    receivedValue: allNull
      ? null
      : round2(items.reduce((sum, it) => sum + (it.receivedQty || 0) * it.unitCost, 0)),
  }
}

async function findItemsForPurchase(id) {
  const [rows] = await pool.query(
    `SELECT pi.*, i.name, i.sku, i.unit
     FROM purchase_items pi
     JOIN items i ON i.id = pi.item_id
     WHERE pi.purchase_id = ?
     ORDER BY i.name ASC`,
    [id],
  )
  return rows.map(mapItem)
}

function mapAttachment(row) {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: Number(row.size),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  }
}

async function findAttachments(id) {
  const [rows] = await pool.query(
    'SELECT id, original_name, mime_type, size, uploaded_by, created_at FROM purchase_attachments WHERE purchase_id = ? ORDER BY id ASC',
    [id],
  )
  return rows.map(mapAttachment)
}

const HEADER_SELECT = `
  SELECT p.*, s.name AS supplier_name, s.email AS supplier_email, l.name AS location_name
  FROM purchases p
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN locations l ON l.id = p.location_id
`

async function fetchPurchase(id) {
  const [rows] = await pool.query(`${HEADER_SELECT} WHERE p.id = ?`, [id])
  if (!rows.length) throw httpError('Purchase not found', 404)
  return mapPurchase(rows[0], await findItemsForPurchase(id), await findAttachments(id))
}

async function listPurchases({ days } = {}) {
  let whereSql = ''
  const params = []
  if (days) {
    whereSql = 'WHERE p.purchase_date >= CURDATE() - INTERVAL ? DAY'
    params.push(Number(days))
  }
  const [rows] = await pool.query(
    `${HEADER_SELECT} ${whereSql}
     ORDER BY p.purchase_date DESC, p.id DESC`,
    params,
  )
  const purchases = []
  for (const row of rows) {
    purchases.push(
      mapPurchase(row, await findItemsForPurchase(row.id), await findAttachments(row.id)),
    )
  }
  return purchases
}

// Creates a DRAFT purchase order. No stock moves yet - lines are ordered
// quantities until the order is received.
async function createPurchase({ purchaseDate, poNumber, supplierId, staff, notes, locationId, items }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    if (!locationId) throw httpError('A location is required for purchases')
    const [locRows] = await connection.query('SELECT id FROM locations WHERE id = ?', [locationId])
    if (!locRows.length) throw httpError(`Location ${locationId} not found`, 404)
    if (!items || !items.length) throw httpError('At least one item is required')

    if (supplierId) {
      const [supplierRows] = await connection.query('SELECT id FROM suppliers WHERE id = ?', [supplierId])
      if (!supplierRows.length) throw httpError(`Supplier ${supplierId} not found`, 404)
    }

    const [header] = await connection.query(
      `INSERT INTO purchases (purchase_date, po_number, supplier_id, staff, location_id, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      [
        purchaseDate || today(),
        poNumber || null,
        supplierId || null,
        staff,
        locationId,
        notes || null,
      ],
    )
    const purchaseId = header.insertId

    for (const line of items) {
      const [itemRows] = await connection.query('SELECT id FROM items WHERE id = ?', [line.itemId])
      if (!itemRows.length) throw httpError(`Item ${line.itemId} not found`, 404)
      const unitCost = Number(line.unitCost) || 0
      await connection.query(
        `INSERT INTO purchase_items (purchase_id, item_id, qty, unit_cost)
         VALUES (?, ?, ?, ?)`,
        [purchaseId, line.itemId, line.qty, unitCost],
      )
    }

    await connection.commit()
    return await fetchPurchase(purchaseId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Marks a draft PO as sent. The recipient email is taken from the supplier's
// saved email unless overridden; the PO is emailed when SMTP is configured.
async function sendPurchase(id, { email } = {}) {
  const [rows] = await pool.query(
    `SELECT p.*, s.name AS supplier_name, s.email AS supplier_email
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.id = ?`,
    [id],
  )
  if (!rows.length) throw httpError('Purchase not found', 404)
  const row = rows[0]
  if (row.status !== 'draft') throw httpError('Only draft purchase orders can be sent', 400)

  const to = (email && String(email).trim()) || row.supplier_email || null
  if (!to) throw httpError('No recipient email - add an email to the supplier or type one', 400)

  const items = await findItemsForPurchase(id)
  const purchase = mapPurchase(row, items)

  const { sent, reason } = await sendMail({
    to,
    subject: purchase.poNumber ? `Purchase Order ${purchase.poNumber}` : `Purchase Order #${purchase.id}`,
    html: buildPurchaseEmail(purchase, items),
  })

  await pool.query(
    `UPDATE purchases SET status = 'sent', sent_at = NOW(), sent_to_email = ? WHERE id = ?`,
    [to, id],
  )

  const updated = await fetchPurchase(id)
  return { ...updated, emailDelivered: sent, emailReason: sent ? null : reason || null }
}

// Goods receipt: records the actually received quantity per line and writes
// IN movements so stock levels rise. The received unit_cost also rolls forward
// into item_prices effective from the purchase date. An optional note and
// file attachments (e.g. the supplier invoice) are stored with the receipt.
async function receivePurchase(id, { items, staff, notes, attachments } = {}) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [pRows] = await connection.query('SELECT * FROM purchases WHERE id = ? FOR UPDATE', [id])
    if (!pRows.length) throw httpError('Purchase not found', 404)
    const purchase = pRows[0]
    if (purchase.status === 'received') throw httpError('Purchase already received', 400)

    const [supplierRows] = await connection.query('SELECT name FROM suppliers WHERE id = ?', [purchase.supplier_id])
    const supplierName = supplierRows.length ? supplierRows[0].name : null
    const reference = purchase.po_number ? `PO ${purchase.po_number}` : `Purchase #${id}`
    const receivingStaff = staff || purchase.staff
    const purchaseDate = dateStr(purchase.purchase_date)

    for (const line of items) {
      const [piRows] = await connection.query(
        'SELECT * FROM purchase_items WHERE purchase_id = ? AND item_id = ?',
        [id, line.itemId],
      )
      if (!piRows.length) throw httpError(`Item ${line.itemId} is not on this purchase`, 404)
      const orderedQty = Number(piRows[0].qty)
      const unitCost = line.unitCost === undefined || line.unitCost === null ? Number(piRows[0].unit_cost) : Number(line.unitCost) || 0
      let receivedQty = line.receivedQty === undefined || line.receivedQty === null ? orderedQty : Number(line.receivedQty) || 0
      receivedQty = Math.max(0, receivedQty)

      await connection.query(
        'UPDATE purchase_items SET received_qty = ?, unit_cost = ? WHERE purchase_id = ? AND item_id = ?',
        [receivedQty, unitCost, id, line.itemId],
      )

      if (receivedQty <= 0) continue

      await connection.query(
        `INSERT INTO stock_movements (item_id, direction, qty, unit_cost, type, reason, staff, location_id, reference)
         VALUES (?, 'IN', ?, ?, 'purchase', ?, ?, ?, ?)`,
        [line.itemId, receivedQty, unitCost, supplierName || 'Purchase', receivingStaff, purchase.location_id, reference],
      )

      // Roll the received cost into the item's current price so stock is
      // valued at the latest purchase cost.
      const [priceRows] = await connection.query(
        `SELECT * FROM item_prices
         WHERE item_id = ? AND effective_from <= CURDATE()
         ORDER BY effective_from DESC, id DESC
         LIMIT 1`,
        [line.itemId],
      )
      const current = priceRows[0]
      if (unitCost > 0 && (!current || Number(current.cost_price) !== unitCost)) {
        await connection.query(
          `INSERT INTO item_prices (item_id, cost_price, selling_price, effective_from)
           VALUES (?, ?, ?, ?)`,
          [line.itemId, unitCost, current ? Number(current.selling_price) : 0, purchaseDate],
        )
      }
    }

    await connection.query(
      `UPDATE purchases SET status = 'received', received_at = NOW(), receive_note = ? WHERE id = ?`,
      [notes || null, id],
    )

    if (attachments && attachments.length) {
      for (const file of attachments) {
        await connection.query(
          `INSERT INTO purchase_attachments (purchase_id, filename, original_name, mime_type, size, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, file.filename, file.originalName, file.mimeType || null, file.size || 0, receivingStaff],
        )
      }
    }

    await connection.commit()
    return await fetchPurchase(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function purchaseReport({ days } = {}) {
  let whereSql = ''
  const params = []
  if (days) {
    whereSql = 'WHERE p.purchase_date >= CURDATE() - INTERVAL ? DAY'
    params.push(Number(days))
  }

  const [statusRows] = await pool.query(
    `SELECT status, COUNT(*) AS cnt
     FROM purchases p
     ${whereSql}
     GROUP BY status`,
    params,
  )
  const statusMap = { draft: 0, sent: 0, received: 0 }
  for (const r of statusRows) statusMap[r.status] = Number(r.cnt)

  const [sumRows] = await pool.query(
    `SELECT
       COUNT(DISTINCT p.id) AS received_count,
       COALESCE(SUM(pi.received_qty), 0) AS received_qty,
       COALESCE(SUM(pi.received_qty * pi.unit_cost), 0) AS received_value
     FROM purchases p
     JOIN purchase_items pi ON pi.purchase_id = p.id
     ${whereSql ? `${whereSql} AND p.status = 'received'` : "WHERE p.status = 'received'"}
     `,
    params,
  )
  const summary = sumRows[0]

  const [supplierRows] = await pool.query(
    `SELECT
       COALESCE(s.id, 0) AS supplier_id,
       COALESCE(s.name, '—') AS supplier_name,
       COUNT(DISTINCT p.id) AS po_count,
       COALESCE(SUM(CASE WHEN p.status = 'received' THEN pi.received_qty ELSE 0 END), 0) AS received_qty,
       COALESCE(SUM(CASE WHEN p.status = 'received' THEN pi.received_qty * pi.unit_cost ELSE 0 END), 0) AS received_value
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     JOIN purchase_items pi ON pi.purchase_id = p.id
     ${whereSql}
     GROUP BY s.id, s.name
     ORDER BY received_value DESC, s.name ASC`,
    params,
  )

  const [itemRows] = await pool.query(
    `SELECT
       i.id AS item_id,
       i.name AS item_name,
       i.sku,
       COALESCE(SUM(CASE WHEN p.status = 'received' THEN pi.received_qty ELSE 0 END), 0) AS received_qty,
       COALESCE(SUM(CASE WHEN p.status = 'received' THEN pi.received_qty * pi.unit_cost ELSE 0 END), 0) AS received_value
     FROM purchases p
     JOIN purchase_items pi ON pi.purchase_id = p.id
     JOIN items i ON i.id = pi.item_id
     ${whereSql}
     GROUP BY i.id, i.name, i.sku
     ORDER BY received_value DESC, i.name ASC`,
    params,
  )

  return {
    counts: { ...statusMap, total: statusMap.draft + statusMap.sent + statusMap.received },
    summary: {
      receivedCount: Number(summary.received_count),
      receivedQty: round2(Number(summary.received_qty)),
      receivedValue: round2(Number(summary.received_value)),
    },
    bySupplier: supplierRows.map((r) => ({
      supplierId: r.supplier_id ? Number(r.supplier_id) : null,
      supplierName: r.supplier_name,
      poCount: Number(r.po_count),
      receivedQty: round2(Number(r.received_qty)),
      receivedValue: round2(Number(r.received_value)),
    })),
    byItem: itemRows.map((r) => ({
      itemId: r.item_id,
      itemName: r.item_name,
      sku: r.sku,
      receivedQty: round2(Number(r.received_qty)),
      receivedValue: round2(Number(r.received_value)),
    })),
    purchases: await reportPurchases(whereSql, params),
  }
}

async function reportPurchases(whereSql, params) {
  const [rows] = await pool.query(
    `SELECT p.id, p.purchase_date, p.po_number, p.status, s.name AS supplier_name
     FROM purchases p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     ${whereSql}
     ORDER BY p.purchase_date DESC, p.id DESC`,
    params,
  )
  const purchases = []
  for (const row of rows) {
    const items = await findItemsForPurchase(row.id)
    purchases.push({
      id: row.id,
      date: row.purchase_date,
      poNumber: row.po_number,
      supplierName: row.supplier_name || null,
      status: row.status,
      items: items.map((it) => ({
        itemId: it.itemId,
        itemName: it.itemName,
        qty: it.qty,
        receivedQty: it.receivedQty,
      })),
    })
  }
  return purchases
}

// Detail view for a supplier's purchase history: metrics, monthly spend
// (chart feed) and every order placed with that supplier.
async function supplierPurchaseReport(supplierId, { days } = {}) {
  const id = Number(supplierId)
  const [supRows] = await pool.query('SELECT id, name, email, contact FROM suppliers WHERE id = ?', [id])
  if (!supRows.length) throw httpError('Supplier not found', 404)

  let whereSql = 'WHERE p.supplier_id = ?'
  const params = [id]
  if (days) {
    whereSql += ' AND p.purchase_date >= CURDATE() - INTERVAL ? DAY'
    params.push(Number(days))
  }

  const [orderRows] = await pool.query(
    `SELECT p.id, p.purchase_date, p.po_number, p.status, l.name AS location_name
     FROM purchases p
     LEFT JOIN locations l ON l.id = p.location_id
     ${whereSql}
     ORDER BY p.purchase_date DESC, p.id DESC`,
    params,
  )

  const orders = []
  for (const row of orderRows) {
    const items = await findItemsForPurchase(row.id)
    const allNull = items.every((it) => it.receivedQty == null)
    orders.push({
      id: row.id,
      date: row.purchase_date,
      poNumber: row.po_number,
      status: row.status,
      locationName: row.location_name || null,
      totalQty: round2(items.reduce((s, it) => s + it.qty, 0)),
      totalValue: round2(items.reduce((s, it) => s + it.value, 0)),
      receivedQty: allNull ? null : round2(items.reduce((s, it) => s + (it.receivedQty || 0), 0)),
      receivedValue: allNull
        ? null
        : round2(items.reduce((s, it) => s + (it.receivedQty || 0) * it.unitCost, 0)),
      items: items.map((it) => ({
        itemName: it.itemName,
        qty: it.qty,
        receivedQty: it.receivedQty,
        unitCost: it.unitCost,
      })),
    })
  }

  const [monthRows] = await pool.query(
    `SELECT DATE_FORMAT(p.purchase_date, '%Y-%m') AS month,
            COALESCE(SUM(pi.qty * pi.unit_cost), 0) AS value,
            COALESCE(SUM(CASE WHEN p.status = 'received' THEN pi.received_qty * pi.unit_cost ELSE 0 END), 0) AS received_value
     FROM purchases p
     JOIN purchase_items pi ON pi.purchase_id = p.id
     ${whereSql}
     GROUP BY month
     ORDER BY month ASC`,
    params,
  )

  const metrics = {
    poCount: orders.length,
    totalValue: round2(orders.reduce((s, o) => s + o.totalValue, 0)),
    receivedCount: orders.filter((o) => o.status === 'received').length,
    receivedValue: round2(orders.reduce((s, o) => s + (o.receivedValue || 0), 0)),
    pendingCount: orders.filter((o) => o.status !== 'received').length,
  }

  return {
    supplier: supRows[0],
    metrics,
    monthly: monthRows.map((r) => ({
      month: r.month,
      value: round2(Number(r.value)),
      receivedValue: round2(Number(r.received_value)),
    })),
    orders,
  }
}

// Detail view for an item's purchasing history: current price, the full cost /
// selling price timeline (chart feed) and every receipt for the item.
async function itemPurchaseReport(itemId, { days } = {}) {
  const id = Number(itemId)
  const [itemRows] = await pool.query('SELECT id, name, sku, unit, category FROM items WHERE id = ?', [id])
  if (!itemRows.length) throw httpError('Item not found', 404)

  const [priceRows] = await pool.query(
    'SELECT effective_from, cost_price, selling_price FROM item_prices WHERE item_id = ? ORDER BY effective_from ASC, id ASC',
    [id],
  )
  const priceHistory = priceRows.map((r) => ({
    effectiveFrom: r.effective_from,
    costPrice: Number(r.cost_price),
    sellingPrice: Number(r.selling_price),
  }))

  let whereSql = "WHERE p.status = 'received' AND pi.item_id = ?"
  const params = [id]
  if (days) {
    whereSql += ' AND p.purchase_date >= CURDATE() - INTERVAL ? DAY'
    params.push(Number(days))
  }

  const [recvRows] = await pool.query(
    `SELECT p.id, p.purchase_date, p.po_number, s.name AS supplier_name, pi.received_qty, pi.unit_cost
     FROM purchases p
     JOIN purchase_items pi ON pi.purchase_id = p.id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     ${whereSql}
     ORDER BY p.purchase_date DESC, p.id DESC`,
    params,
  )
  const receipts = recvRows.map((r) => ({
    id: r.id,
    date: r.purchase_date,
    poNumber: r.po_number,
    supplierName: r.supplier_name || null,
    receivedQty: Number(r.received_qty),
    unitCost: Number(r.unit_cost),
  }))

  const metrics = {
    poCount: receipts.length,
    receivedQty: round2(receipts.reduce((s, r) => s + r.receivedQty, 0)),
    receivedValue: round2(receipts.reduce((s, r) => s + r.receivedQty * r.unitCost, 0)),
  }

  return { item: itemRows[0], metrics, priceHistory, receipts }
}

async function getAttachment(id) {
  const [rows] = await pool.query('SELECT * FROM purchase_attachments WHERE id = ?', [Number(id)])
  return rows[0] || null
}

module.exports = { createPurchase, listPurchases, sendPurchase, receivePurchase, purchaseReport, supplierPurchaseReport, itemPurchaseReport, getAttachment }
