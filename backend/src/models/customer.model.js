const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

const BASE_COLUMNS = 'id, first_name, last_name, email, phone, notes, is_active, created_at'

function mapCustomer(row) {
  if (!row) return null
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS} FROM customers ORDER BY last_name ASC, first_name ASC`,
  )
  return rows.map(mapCustomer)
}

async function findById(id) {
  const [rows] = await pool.query(`SELECT ${BASE_COLUMNS} FROM customers WHERE id = ?`, [id])
  return mapCustomer(rows[0])
}

async function create({ firstName, lastName, email, phone, notes }) {
  const [result] = await pool.query(
    'INSERT INTO customers (first_name, last_name, email, phone, notes) VALUES (?, ?, ?, ?, ?)',
    [firstName, lastName, email || null, phone || null, notes || null],
  )
  return findById(result.insertId)
}

async function update(id, { firstName, lastName, email, phone, notes, isActive }) {
  const [result] = await pool.query(
    'UPDATE customers SET first_name = ?, last_name = ?, email = ?, phone = ?, notes = ?, is_active = ? WHERE id = ?',
    [firstName, lastName, email || null, phone || null, notes || null, isActive ? 1 : 0, id],
  )
  if (result.affectedRows === 0) throw httpError('Customer not found', 404)
  return findById(id)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [id])
  if (!rows.length) throw httpError('Customer not found', 404)
  await pool.query('DELETE FROM customers WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
