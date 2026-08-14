const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapCenter(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    locationId: row.location_id,
    locationName: row.location_name || null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    groupCount: row.group_count ? Number(row.group_count) : 0,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT pc.id, pc.name, pc.code, pc.description, pc.location_id, pc.is_active, pc.created_at,
            l.name AS location_name,
            (SELECT COUNT(*) FROM accounting_group_production_centers agpc WHERE agpc.production_center_id = pc.id) AS group_count
     FROM production_centers pc
     LEFT JOIN locations l ON l.id = pc.location_id
     ORDER BY pc.name ASC`,
  )
  return rows.map(mapCenter)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT pc.id, pc.name, pc.code, pc.description, pc.location_id, pc.is_active, pc.created_at,
            l.name AS location_name,
            (SELECT COUNT(*) FROM accounting_group_production_centers agpc WHERE agpc.production_center_id = pc.id) AS group_count
     FROM production_centers pc
     LEFT JOIN locations l ON l.id = pc.location_id
     WHERE pc.id = ?`,
    [id],
  )
  return mapCenter(rows[0])
}

async function create({ name, code, description, locationId }) {
  const [result] = await pool.query(
    'INSERT INTO production_centers (name, code, description, location_id) VALUES (?, ?, ?, ?)',
    [name, code || null, description || null, locationId || null],
  )
  return findById(result.insertId)
}

async function update(id, { name, code, description, locationId, isActive }) {
  const [result] = await pool.query(
    'UPDATE production_centers SET name = ?, code = ?, description = ?, location_id = ?, is_active = ? WHERE id = ?',
    [name, code || null, description || null, locationId || null, isActive ? 1 : 0, id],
  )
  if (result.affectedRows === 0) throw httpError('Production center not found', 404)
  return findById(id)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM production_centers WHERE id = ?', [id])
  if (!rows.length) throw httpError('Production center not found', 404)
  await pool.query('DELETE FROM production_centers WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
