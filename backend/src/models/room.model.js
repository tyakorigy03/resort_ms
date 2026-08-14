const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapRoom(row) {
  if (!row) return null
  return {
    id: row.id,
    roomNumber: row.room_number,
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name || null,
    floor: row.floor,
    status: row.status,
    housekeepingStatus: row.housekeeping_status,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT r.id, r.room_number, r.room_type_id, r.floor, r.status, r.housekeeping_status, r.is_active, r.created_at,
            rt.name AS room_type_name
     FROM rooms r
     LEFT JOIN room_types rt ON rt.id = r.room_type_id
     ORDER BY r.room_number ASC`,
  )
  return rows.map(mapRoom)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT r.id, r.room_number, r.room_type_id, r.floor, r.status, r.housekeeping_status, r.is_active, r.created_at,
            rt.name AS room_type_name
     FROM rooms r
     LEFT JOIN room_types rt ON rt.id = r.room_type_id
     WHERE r.id = ?`,
    [id],
  )
  return mapRoom(rows[0])
}

async function create({ roomNumber, roomTypeId, floor }) {
  const [result] = await pool.query(
    'INSERT INTO rooms (room_number, room_type_id, floor) VALUES (?, ?, ?)',
    [roomNumber, roomTypeId, floor || null],
  )
  return findById(result.insertId)
}

async function update(id, { roomNumber, roomTypeId, floor, status, housekeepingStatus, isActive }) {
  const [result] = await pool.query(
    `UPDATE rooms SET room_number = ?, room_type_id = ?, floor = ?, status = ?, housekeeping_status = ?, is_active = ? WHERE id = ?`,
    [roomNumber, roomTypeId, floor || null, status || 'available', housekeepingStatus || 'dirty', isActive ? 1 : 0, id],
  )
  if (result.affectedRows === 0) throw httpError('Room not found', 404)
  return findById(id)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM rooms WHERE id = ?', [id])
  if (!rows.length) throw httpError('Room not found', 404)
  await pool.query('DELETE FROM rooms WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
