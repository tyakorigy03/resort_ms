const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

async function findAll() {
  const [rows] = await pool.query(
    `SELECT pl.id, pl.name, pl.currency, pl.is_default, pl.created_at, COUNT(mp.id) AS item_count
     FROM price_lists pl
     LEFT JOIN menu_prices mp ON mp.price_list_id = pl.id
     GROUP BY pl.id, pl.name, pl.currency, pl.is_default, pl.created_at
     ORDER BY pl.is_default DESC, pl.name ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    currency: r.currency,
    isDefault: !!r.is_default,
    createdAt: r.created_at,
    itemCount: Number(r.item_count),
  }))
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, currency, is_default FROM price_lists WHERE id = ?', [id])
  return rows[0]
    ? {
        id: rows[0].id,
        name: rows[0].name,
        currency: rows[0].currency,
        isDefault: !!rows[0].is_default,
      }
    : null
}

async function create({ name, currency }) {
  const [existing] = await pool.query('SELECT COUNT(*) AS total FROM price_lists')
  const isDefault = existing[0].total === 0 ? 1 : 0
  const [result] = await pool.query(
    'INSERT INTO price_lists (name, currency, is_default) VALUES (?, ?, ?)',
    [name, currency || 'USD', isDefault],
  )
  return findById(result.insertId)
}

async function update(id, { name, currency }) {
  const [result] = await pool.query(
    'UPDATE price_lists SET name = ?, currency = ? WHERE id = ?',
    [name, currency || 'USD', id],
  )
  if (result.affectedRows === 0) throw httpError('Price list not found', 404)
  return findById(id)
}

async function setDefault(id) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query('SELECT id FROM price_lists WHERE id = ?', [id])
    if (!rows.length) throw httpError('Price list not found', 404)
    await connection.query('UPDATE price_lists SET is_default = 0')
    await connection.query('UPDATE price_lists SET is_default = 1 WHERE id = ?', [id])
    await connection.commit()
    return findById(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function remove(id) {
  const [rows] = await pool.query('SELECT is_default FROM price_lists WHERE id = ?', [id])
  if (!rows.length) throw httpError('Price list not found', 404)
  await pool.query('DELETE FROM price_lists WHERE id = ?', [id])
  if (rows[0].is_default) {
    const [next] = await pool.query('SELECT id FROM price_lists ORDER BY id LIMIT 1')
    if (next.length) {
      await pool.query('UPDATE price_lists SET is_default = 1 WHERE id = ?', [next[0].id])
    }
  }
}

async function listItemsWithPrices(priceListId) {
  const [rows] = await pool.query(
    `SELECT i.id, i.name, i.unit, mp.price
     FROM items i
     LEFT JOIN menu_prices mp ON mp.item_id = i.id AND mp.price_list_id = ?
     ORDER BY i.name ASC`,
    [priceListId],
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    price: r.price === null ? null : Number(r.price),
  }))
}

async function setListPrices(priceListId, prices = []) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query('SELECT id FROM price_lists WHERE id = ?', [priceListId])
    if (!rows.length) throw httpError('Price list not found', 404)
    await connection.query('DELETE FROM menu_prices WHERE price_list_id = ?', [priceListId])
    for (const p of prices) {
      const itemId = Number(p.itemId)
      const price = Number(p.price)
      if (!itemId || Number.isNaN(price) || price < 0) continue
      await connection.query(
        'INSERT INTO menu_prices (item_id, price_list_id, price) VALUES (?, ?, ?)',
        [itemId, priceListId, price],
      )
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  setDefault,
  remove,
  listItemsWithPrices,
  setListPrices,
}
