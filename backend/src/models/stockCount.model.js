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
  const countedValue = round2(Number(row.counted_qty) * Number(row.cost_price))
  const systemValue = round2(Number(row.system_qty) * Number(row.cost_price))
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.name,
    sku: row.sku,
    unit: row.unit,
    systemQty: Number(row.system_qty),
    countedQty: Number(row.counted_qty),
    costPrice: Number(row.cost_price),
    systemValue,
    countedValue,
    variance: round2(countedValue - systemValue),
    varianceQty: round2(Number(row.counted_qty) - Number(row.system_qty)),
  }
}

function mapBatch(row, items) {
  return {
    id: row.id,
    countDate: row.count_date,
    staff: row.staff,
    locationId: row.location_id ? Number(row.location_id) : null,
    locationName: row.location_name || null,
    notes: row.notes,
    createdAt: row.created_at,
    itemCount: items.length,
    items,
    totalSystemValue: round2(items.reduce((sum, it) => sum + it.systemValue, 0)),
    totalCountedValue: round2(items.reduce((sum, it) => sum + it.countedValue, 0)),
    totalVariance: round2(items.reduce((sum, it) => sum + it.variance, 0)),
    totalVarianceQty: round2(items.reduce((sum, it) => sum + it.varianceQty, 0)),
  }
}

async function findItemsForBatch(id) {
  const [rows] = await pool.query(
    `SELECT sci.*, i.name, i.sku, i.unit
     FROM stock_count_items sci
     JOIN items i ON i.id = sci.item_id
     WHERE sci.stock_count_id = ?
     ORDER BY i.name ASC`,
    [id],
  )
  return rows.map(mapItem)
}

async function listStockCounts({ days } = {}) {
  let whereSql = ''
  const params = []
  if (days) {
    whereSql = 'WHERE sc.count_date >= CURDATE() - INTERVAL ? DAY'
    params.push(Number(days))
  }
  const [rows] = await pool.query(
    `SELECT sc.*, l.name AS location_name
     FROM stock_counts sc
     LEFT JOIN locations l ON l.id = sc.location_id
     ${whereSql} ORDER BY sc.count_date DESC, sc.id DESC`,
    params,
  )
  const batches = []
  for (const row of rows) {
    batches.push(mapBatch(row, await findItemsForBatch(row.id)))
  }
  return batches
}

async function createStockCount({ countDate, staff, notes, items, locationId }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    if (!locationId) throw httpError('A location is required for a stock count')
    const [locRows] = await connection.query('SELECT id FROM locations WHERE id = ?', [locationId])
    if (!locRows.length) throw httpError(`Location ${locationId} not found`, 404)

    const [header] = await connection.query(
      'INSERT INTO stock_counts (count_date, staff, location_id, notes) VALUES (?, ?, ?, ?)',
      [countDate || today(), staff, locationId, notes || null],
    )
    const batchId = header.insertId
    for (const line of items) {
      const [itemRows] = await connection.query('SELECT id FROM items WHERE id = ?', [line.itemId])
      if (!itemRows.length) throw httpError(`Item ${line.itemId} not found`, 404)

      const price = await getCurrentPrice(line.itemId)
      const costPrice = price ? price.costPrice : 0

      // System qty is the ledger balance for THIS location at count time
      // (automatic).
      const [balanceRows] = await connection.query(
        `SELECT COALESCE(SUM(CASE WHEN direction = 'IN' THEN qty WHEN direction = 'OUT' THEN -qty END), 0) AS on_hand
         FROM stock_movements WHERE item_id = ? AND location_id = ?`,
        [line.itemId, locationId],
      )
      const systemQty = Number(balanceRows[0].on_hand)

      await connection.query(
        `INSERT INTO stock_count_items (stock_count_id, item_id, system_qty, counted_qty, cost_price)
         VALUES (?, ?, ?, ?, ?)`,
        [batchId, line.itemId, systemQty, line.countedQty ?? 0, costPrice],
      )

      // Reconcile THIS location's ledger to the counted quantity so stock
      // levels reflect the count (variance drives an IN/OUT adjustment
      // movement tagged with the location).
      const delta = round2((line.countedQty ?? 0) - systemQty)
      if (delta !== 0) {
        await connection.query(
          `INSERT INTO stock_movements (item_id, direction, qty, unit_cost, type, staff, location_id, reference)
           VALUES (?, ?, ?, ?, 'count', ?, ?, ?)`,
          [line.itemId, delta > 0 ? 'IN' : 'OUT', Math.abs(delta), costPrice, staff, locationId, `Stock count #${batchId}`],
        )
      }
    }
    await connection.commit()
    const [rows] = await pool.query(
      `SELECT sc.*, l.name AS location_name
       FROM stock_counts sc
       LEFT JOIN locations l ON l.id = sc.location_id
       WHERE sc.id = ?`,
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

module.exports = { listStockCounts, createStockCount }
