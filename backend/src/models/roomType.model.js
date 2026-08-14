const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapRoomType(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    maxGuests: row.max_guests,
    baseRate: Number(row.base_rate),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    roomCount: row.room_count ? Number(row.room_count) : 0,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT rt.id, rt.name, rt.description, rt.max_guests, rt.base_rate, rt.is_active, rt.created_at,
            (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id) AS room_count
     FROM room_types rt ORDER BY rt.name ASC`,
  )
  return rows.map(mapRoomType)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT rt.id, rt.name, rt.description, rt.max_guests, rt.base_rate, rt.is_active, rt.created_at,
            (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id) AS room_count
     FROM room_types rt WHERE rt.id = ?`,
    [id],
  )
  return mapRoomType(rows[0])
}

async function create({ name, description, maxGuests, baseRate }) {
  const [result] = await pool.query(
    'INSERT INTO room_types (name, description, max_guests, base_rate) VALUES (?, ?, ?, ?)',
    [name, description || null, Number(maxGuests) || 1, Number(baseRate) || 0],
  )
  return findById(result.insertId)
}

async function update(id, { name, description, maxGuests, baseRate, isActive }) {
  const [result] = await pool.query(
    'UPDATE room_types SET name = ?, description = ?, max_guests = ?, base_rate = ?, is_active = ? WHERE id = ?',
    [name, description || null, Number(maxGuests) || 1, Number(baseRate) || 0, isActive ? 1 : 0, id],
  )
  if (result.affectedRows === 0) throw httpError('Room type not found', 404)
  return findById(id)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT name FROM room_types WHERE id = ?', [id])
  if (!rows.length) throw httpError('Room type not found', 404)
  const [used] = await pool.query('SELECT COUNT(*) AS total FROM rooms WHERE room_type_id = ?', [id])
  if (used[0].total > 0) {
    throw httpError(`Room type is used by ${used[0].total} room(s); reassign them first`, 409)
  }
  await pool.query('DELETE FROM room_types WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
