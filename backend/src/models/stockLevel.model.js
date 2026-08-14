const { pool } = require('../config/db')
const { getCurrentPrice } = require('./price.model')

function round2(n) {
  return Math.round(n * 100) / 100
}

const NET_SUM = `COALESCE(SUM(CASE WHEN sm.direction = 'IN' THEN sm.qty WHEN sm.direction = 'OUT' THEN -sm.qty END), 0)`

// On-hand = net IN/OUT from the stock_movements ledger, valued at the current
// cost price. Levels are per (item, location). Pass locationId for one
// location (every item returns a row, even with 0 on hand); omit it for
// whole-store totals with a per-location breakdown on each row.
async function listStockLevels({ locationId } = {}) {
  const levels = []
  const prices = new Map()

  if (locationId) {
    const [rows] = await pool.query(
      `SELECT i.id, i.name, i.sku, i.unit, l.id AS location_id, l.name AS location_name,
         ${NET_SUM} AS on_hand
       FROM items i
       CROSS JOIN locations l
       LEFT JOIN stock_movements sm ON sm.item_id = i.id AND sm.location_id = l.id
       WHERE l.id = ?
       GROUP BY i.id, i.name, i.sku, i.unit, l.id, l.name
       ORDER BY i.name ASC`,
      [Number(locationId)],
    )
    for (const row of rows) {
      const price = prices.get(row.id) ?? (await getCurrentPrice(row.id))
      if (!prices.has(row.id)) prices.set(row.id, price)
      const costPrice = price ? price.costPrice : 0
      const onHand = Number(row.on_hand)
      levels.push({
        locationId: row.location_id,
        locationName: row.location_name,
        itemId: row.id,
        itemName: row.name,
        sku: row.sku,
        unit: row.unit,
        onHand,
        costPrice,
        stockValue: round2(onHand * costPrice),
      })
    }
    return levels
  }

  const [rows] = await pool.query(
    `SELECT i.id, i.name, i.sku, i.unit, ${NET_SUM} AS on_hand
     FROM items i
     LEFT JOIN stock_movements sm ON sm.item_id = i.id
     GROUP BY i.id, i.name, i.sku, i.unit
     ORDER BY i.name ASC`,
  )
  const [breakdownRows] = await pool.query(
    `SELECT sm.item_id, l.id AS location_id, l.name AS location_name,
       ${NET_SUM} AS on_hand
     FROM stock_movements sm
     JOIN locations l ON l.id = sm.location_id
     GROUP BY sm.item_id, l.id, l.name
     ORDER BY l.name ASC`,
  )
  const byItem = new Map()
  for (const row of breakdownRows) {
    const itemId = row.item_id
    if (!byItem.has(itemId)) byItem.set(itemId, [])
    byItem.get(itemId).push({
      locationId: row.location_id,
      locationName: row.location_name,
      onHand: Number(row.on_hand),
    })
  }

  for (const row of rows) {
    const price = prices.get(row.id) ?? (await getCurrentPrice(row.id))
    if (!prices.has(row.id)) prices.set(row.id, price)
    const costPrice = price ? price.costPrice : 0
    const onHand = Number(row.on_hand)
    levels.push({
      itemId: row.id,
      itemName: row.name,
      sku: row.sku,
      unit: row.unit,
      onHand,
      costPrice,
      stockValue: round2(onHand * costPrice),
      locations: byItem.get(row.id) ?? [],
    })
  }
  return levels
}

module.exports = { listStockLevels }
