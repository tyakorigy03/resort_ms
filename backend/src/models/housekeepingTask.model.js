const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapTask(row) {
  if (!row) return null
  return {
    id: row.id,
    roomId: row.room_id,
    roomNumber: row.room_number || null,
    taskType: row.task_type,
    status: row.status,
    staffId: row.staff_id,
    staffName: row.staff_name || null,
    priority: row.priority,
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT t.id, t.room_id, t.task_type, t.status, t.staff_id, t.priority, t.notes, t.completed_at, t.created_at,
            r.room_number, CONCAT_WS(' ', s.first_name, s.last_name) AS staff_name
     FROM housekeeping_tasks t
     LEFT JOIN rooms r ON r.id = t.room_id
     LEFT JOIN staff s ON s.id = t.staff_id
     ORDER BY t.created_at DESC`,
  )
  return rows.map(mapTask)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT t.id, t.room_id, t.task_type, t.status, t.staff_id, t.priority, t.notes, t.completed_at, t.created_at,
            r.room_number, CONCAT_WS(' ', s.first_name, s.last_name) AS staff_name
     FROM housekeeping_tasks t
     LEFT JOIN rooms r ON r.id = t.room_id
     LEFT JOIN staff s ON s.id = t.staff_id
     WHERE t.id = ?`,
    [id],
  )
  return mapTask(rows[0])
}

async function create({ roomId, taskType, status, staffId, priority, notes }) {
  const [result] = await pool.query(
    'INSERT INTO housekeeping_tasks (room_id, task_type, status, staff_id, priority, notes, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [roomId, taskType || 'clean', status || 'pending', staffId || null, priority || 'medium', notes || null, status === 'done' ? new Date() : null],
  )
  return findById(result.insertId)
}

async function update(id, { roomId, taskType, status, staffId, priority, notes }) {
  const completedAt = status === 'done' ? new Date() : status === 'cancelled' || status === 'pending' || status === 'in_progress' ? null : undefined
  const [result] = await pool.query(
    'UPDATE housekeeping_tasks SET room_id = ?, task_type = ?, status = ?, staff_id = ?, priority = ?, notes = ?, completed_at = ? WHERE id = ?',
    [roomId, taskType || 'clean', status || 'pending', staffId || null, priority || 'medium', notes || null, completedAt === undefined ? undefined : completedAt, id],
  )
  if (result.affectedRows === 0) throw httpError('Housekeeping task not found', 404)
  return findById(id)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM housekeeping_tasks WHERE id = ?', [id])
  if (!rows.length) throw httpError('Housekeeping task not found', 404)
  await pool.query('DELETE FROM housekeeping_tasks WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
