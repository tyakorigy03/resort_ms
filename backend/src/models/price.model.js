const { pool } = require('../config/db')

function mapPrice(row) {
  if (!row) return null
  return {
    id: row.id,
    itemId: row.item_id,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    effectiveFrom: row.effective_from,
    createdAt: row.created_at,
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// Current effective price as of today (latest effective_from <= CURDATE()).
async function getCurrentPrice(itemId) {
  const [rows] = await pool.query(
    `SELECT * FROM item_prices
     WHERE item_id = ? AND effective_from <= CURDATE()
     ORDER BY effective_from DESC, id DESC
     LIMIT 1`,
    [itemId],
  )
  return mapPrice(rows[0])
}

async function listPrices(itemId) {
  const [rows] = await pool.query(
    `SELECT * FROM item_prices
     WHERE item_id = ?
     ORDER BY effective_from DESC, id DESC`,
    [itemId],
  )
  return rows.map(mapPrice)
}

async function setPrice(itemId, { costPrice, sellingPrice, effectiveFrom }) {
  const [result] = await pool.query(
    `INSERT INTO item_prices (item_id, cost_price, selling_price, effective_from)
     VALUES (?, ?, ?, ?)`,
    [
      itemId,
      costPrice ?? 0,
      sellingPrice ?? 0,
      effectiveFrom || today(),
    ],
  )
  const [rows] = await pool.query('SELECT * FROM item_prices WHERE id = ?', [result.insertId])
  return mapPrice(rows[0])
}

module.exports = { getCurrentPrice, listPrices, setPrice }
