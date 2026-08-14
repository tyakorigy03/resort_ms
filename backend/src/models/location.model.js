const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

async function findAll() {
  const [rows] = await pool.query(
    `SELECT l.id, l.name, l.description, l.is_default, l.created_at,
       COUNT(DISTINCT sm.item_id) AS item_count
     FROM locations l
     LEFT JOIN stock_movements sm ON sm.location_id = l.id
     GROUP BY l.id, l.name, l.description, l.is_default, l.created_at
     ORDER BY l.is_default DESC, l.name ASC`,
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    itemCount: Number(row.item_count),
  }))
}

async function create({ name, description }) {
  const [result] = await pool.query('INSERT INTO locations (name, description) VALUES (?, ?)', [
    name,
    description || null,
  ])
  const [rows] = await pool.query('SELECT * FROM locations WHERE id = ?', [result.insertId])
  return rows[0]
}

async function update(id, { name, description }) {
  const [result] = await pool.query('UPDATE locations SET name = ?, description = ? WHERE id = ?', [
    name,
    description || null,
    id,
  ])
  if (result.affectedRows === 0) throw httpError(`Location ${id} not found`, 404)
  const [rows] = await pool.query('SELECT * FROM locations WHERE id = ?', [id])
  return rows[0]
}

async function remove(id) {
  const [rows] = await pool.query('SELECT * FROM locations WHERE id = ?', [id])
  if (!rows.length) throw httpError(`Location ${id} not found`, 404)
  if (rows[0].is_default) throw httpError('The default location cannot be deleted')
  const [usage] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM stock_movements WHERE location_id = ?) AS movements,
       (SELECT COUNT(*) FROM stock_counts WHERE location_id = ?) AS counts`,
    [id, id],
  )
  if (Number(usage[0].movements) > 0 || Number(usage[0].counts) > 0) {
    throw httpError('This location still has stock movements or counts. Move or delete them first.')
  }
  await pool.query('DELETE FROM locations WHERE id = ?', [id])
  return { id }
}

module.exports = { findAll, create, update, remove }
