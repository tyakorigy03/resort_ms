const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

async function attachItems(combos) {
  if (combos.length === 0) return
  const ids = combos.map((c) => c.id)
  const placeholders = ids.map(() => '?').join(', ')
  const [rows] = await pool.query(
    `SELECT ci.combo_id, ci.item_id, ci.qty, i.name AS item_name, i.unit
     FROM combo_items ci
     JOIN items i ON i.id = ci.item_id
     WHERE ci.combo_id IN (${placeholders})
     ORDER BY i.name ASC`,
    ids,
  )
  const byCombo = new Map()
  for (const row of rows) {
    if (!byCombo.has(row.combo_id)) byCombo.set(row.combo_id, [])
    byCombo.get(row.combo_id).push({
      itemId: row.item_id,
      itemName: row.item_name,
      unit: row.unit,
      qty: Number(row.qty),
    })
  }
  for (const combo of combos) {
    combo.items = byCombo.get(combo.id) ?? []
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.description, c.price, c.created_at, COUNT(ci.id) AS item_count
     FROM combos c
     LEFT JOIN combo_items ci ON ci.combo_id = c.id
     GROUP BY c.id, c.name, c.description, c.price, c.created_at
     ORDER BY c.name ASC`,
  )
  const combos = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    itemCount: Number(r.item_count),
  }))
  await attachItems(combos)
  return combos
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, description, price FROM combos WHERE id = ?', [id])
  if (!rows.length) return null
  const combo = {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    price: Number(rows[0].price),
  }
  await attachItems([combo])
  return combo
}

async function setItems(connection, comboId, items = []) {
  await connection.query('DELETE FROM combo_items WHERE combo_id = ?', [comboId])
  for (const line of items) {
    const itemId = Number(line.itemId)
    const qty = Number(line.qty) || 1
    if (!itemId) continue
    await connection.query('INSERT INTO combo_items (combo_id, item_id, qty) VALUES (?, ?, ?)', [
      comboId,
      itemId,
      qty,
    ])
  }
}

async function create({ name, description, price, items }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.query('INSERT INTO combos (name, description, price) VALUES (?, ?, ?)', [
      name,
      description || null,
      price ?? 0,
    ])
    await setItems(connection, result.insertId, items)
    await connection.commit()
    return findById(result.insertId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function update(id, { name, description, price, items }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.query('UPDATE combos SET name = ?, description = ?, price = ? WHERE id = ?', [
      name,
      description || null,
      price ?? 0,
      id,
    ])
    if (result.affectedRows === 0) throw httpError('Combo not found', 404)
    await setItems(connection, id, items)
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
  const [result] = await pool.query('DELETE FROM combos WHERE id = ?', [id])
  if (result.affectedRows === 0) throw httpError('Combo not found', 404)
}

module.exports = { findAll, findById, create, update, remove }
