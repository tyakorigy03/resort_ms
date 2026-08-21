const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapOutlet(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    code: row.code,
    address: row.address,
    phone: row.phone,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    deviceCount: row.device_count ? Number(row.device_count) : 0,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT o.id, o.name, o.type, o.code, o.address, o.phone, o.is_active, o.created_at,
            (SELECT COUNT(*) FROM devices d WHERE d.outlet_id = o.id) AS device_count
     FROM outlets o ORDER BY o.name ASC`,
  )
  return rows.map(mapOutlet)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT o.id, o.name, o.type, o.code, o.address, o.phone, o.is_active, o.created_at,
            (SELECT COUNT(*) FROM devices d WHERE d.outlet_id = o.id) AS device_count
     FROM outlets o WHERE o.id = ?`,
    [id],
  )
  return mapOutlet(rows[0])
}

async function create({ name, type, code, address, phone }) {
  const [result] = await pool.query(
    'INSERT INTO outlets (name, type, code, address, phone) VALUES (?, ?, ?, ?, ?)',
    [name, type || 'restaurant', code || null, address || null, phone || null],
  )
  return findById(result.insertId)
}

async function update(id, { name, type, code, address, phone, isActive }) {
  const [result] = await pool.query(
    'UPDATE outlets SET name = ?, type = ?, code = ?, address = ?, phone = ?, is_active = ? WHERE id = ?',
    [name, type || 'restaurant', code || null, address || null, phone || null, isActive ? 1 : 0, id],
  )
  if (result.affectedRows === 0) throw httpError('Outlet not found', 404)
  return findById(id)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM outlets WHERE id = ?', [id])
  if (!rows.length) throw httpError('Outlet not found', 404)
  await pool.query('DELETE FROM outlets WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
