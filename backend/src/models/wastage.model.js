const { pool } = require('../config/db')
const { getCurrentPrice } = require('./price.model')
const { httpError } = require('../utils/errors')

function round2(n) {
  return Math.round(n * 100) / 100
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function mapItem(row) {
  const qty = Number(row.qty)
  const unitCost = Number(row.unit_cost)
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.name,
    sku: row.sku,
    unit: row.unit,
    qty,
    reason: row.reason,
    unitCost,
    value: round2(qty * unitCost),
  }
}

function mapBatch(row, items) {
  return {
    id: row.id,
    date: row.date,
    staff: row.staff,
    locationId: row.location_id ? Number(row.location_id) : null,
    locationName: row.location_name || null,
    notes: row.notes,
    createdAt: row.created_at,
    itemCount: items.length,
    items,
    totalQty: round2(items.reduce((sum, it) => sum + it.qty, 0)),
    totalValue: round2(items.reduce((sum, it) => sum + it.value, 0)),
  }
}

async function findItemsForBatch(id) {
  const [rows] = await pool.query(
    `SELECT wi.*, i.name, i.sku, i.unit
     FROM wastage_items wi
     JOIN items i ON i.id = wi.item_id
     WHERE wi.wastage_batch_id = ?
     ORDER BY i.name ASC`,
    [id],
  )
  return rows.map(mapItem)
}

async function listWastages({ days } = {}) {
  let whereSql = ''
  const params = []
  if (days) {
    whereSql = 'WHERE wb.date >= CURDATE() - INTERVAL ? DAY'
    params.push(Number(days))
  }
  const [rows] = await pool.query(
    `SELECT wb.*, l.name AS location_name
     FROM wastage_batches wb
     LEFT JOIN locations l ON l.id = wb.location_id
     ${whereSql}
     ORDER BY wb.date DESC, wb.id DESC`,
    params,
  )
  const batches = []
  for (const row of rows) {
    batches.push(mapBatch(row, await findItemsForBatch(row.id)))
  }
  return batches
}

// A wastage batch groups several write-offs on one occasion. Each line is an
// OUT movement with type='wastage' in the shared ledger (unit_cost snapshotted
// from the current price), so stock levels drop automatically.
async function createWastage({ date, staff, notes, locationId, items }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    if (!locationId) throw httpError('A location is required for wastage')
    const [locRows] = await connection.query('SELECT id FROM locations WHERE id = ?', [locationId])
    if (!locRows.length) throw httpError(`Location ${locationId} not found`, 404)
    if (!items || !items.length) throw httpError('At least one item is required')

    const [header] = await connection.query(
      'INSERT INTO wastage_batches (date, staff, location_id, notes) VALUES (?, ?, ?, ?)',
      [date || today(), staff, locationId, notes || null],
    )
    const batchId = header.insertId

    for (const line of items) {
      const [itemRows] = await connection.query('SELECT id FROM items WHERE id = ?', [line.itemId])
      if (!itemRows.length) throw httpError(`Item ${line.itemId} not found`, 404)
      if (!line.reason || !line.reason.trim()) {
        throw httpError('Each wastage item needs a reason')
      }

      const price = await getCurrentPrice(line.itemId)
      const costPrice = price ? price.costPrice : 0

      await connection.query(
        `INSERT INTO wastage_items (wastage_batch_id, item_id, qty, reason, unit_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [batchId, line.itemId, line.qty, line.reason.trim(), costPrice],
      )
      await connection.query(
        `INSERT INTO stock_movements (item_id, direction, qty, unit_cost, type, reason, staff, location_id, reference)
         VALUES (?, 'OUT', ?, ?, 'wastage', ?, ?, ?, ?)`,
        [line.itemId, line.qty, costPrice, line.reason.trim(), staff || null, locationId, `Wastage batch #${batchId}`],
      )
    }

    await connection.commit()
    const [rows] = await pool.query(
      `SELECT wb.*, l.name AS location_name
       FROM wastage_batches wb
       LEFT JOIN locations l ON l.id = wb.location_id
       WHERE wb.id = ?`,
      [batchId],
    )
    return mapBatch(rows[0], await findItemsForBatch(batchId))
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { createWastage, listWastages }
