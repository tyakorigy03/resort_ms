const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

const BASE_COLUMNS = 'id, name, email, role, is_active, created_at'

function mapUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

async function findAll({ includeInactive = false } = {}) {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS} FROM users ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY name ASC`,
  )
  return rows.map(mapUser)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS} FROM users WHERE id = ?`,
    [id],
  )
  return mapUser(rows[0])
}

async function findByEmail(email) {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS} FROM users WHERE email = ?`,
    [email],
  )
  return mapUser(rows[0])
}

async function findByEmailWithPassword(email) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password, role, is_active, created_at FROM users WHERE email = ?',
    [email],
  )
  return rows[0]
}

async function create({ name, email, password, role }) {
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, password, role || 'staff'],
  )
  return findById(result.insertId)
}

async function update(id, { name, email, role, isActive }) {
  const [result] = await pool.query(
    `UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE id = ?`,
    [name, email, role, isActive ? 1 : 0, id],
  )
  if (result.affectedRows === 0) throw httpError('User not found', 404)
  return findById(id)
}

async function setPassword(id, password) {
  const [result] = await pool.query(
    'UPDATE users SET password = ? WHERE id = ?',
    [password, id],
  )
  if (result.affectedRows === 0) throw httpError('User not found', 404)
  return findById(id)
}

module.exports = { findAll, findById, findByEmail, findByEmailWithPassword, create, update, setPassword }
