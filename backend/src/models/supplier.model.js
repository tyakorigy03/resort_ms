const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

async function findAll() {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.contact, s.email, s.created_at, COUNT(is2.item_id) AS item_count
     FROM suppliers s
     LEFT JOIN item_suppliers is2 ON is2.supplier_id = s.id
     GROUP BY s.id, s.name, s.contact, s.email, s.created_at
     ORDER BY s.name ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    email: r.email,
    createdAt: r.created_at,
    itemCount: Number(r.item_count),
  }))
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, contact, email, created_at FROM suppliers WHERE id = ?', [id])
  return rows[0]
}

async function create({ name, contact, email }) {
  const [result] = await pool.query('INSERT INTO suppliers (name, contact, email) VALUES (?, ?, ?)', [
    name,
    contact || null,
    email || null,
  ])
  return findById(result.insertId)
}

async function update(id, { name, contact, email }) {
  const [result] = await pool.query('UPDATE suppliers SET name = ?, contact = ?, email = ? WHERE id = ?', [
    name,
    contact || null,
    email || null,
    id,
  ])
  if (result.affectedRows === 0) throw httpError('Supplier not found', 404)
  return findById(id)
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM suppliers WHERE id = ?', [id])
  if (result.affectedRows === 0) throw httpError('Supplier not found', 404)
}

module.exports = { findAll, findById, create, update, remove }
