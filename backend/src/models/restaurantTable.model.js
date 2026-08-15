const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapTable(row) {
  return {
    id: row.id,
    floorPlanId: row.floor_plan_id,
    floorPlanName: row.floor_plan_name || null,
    label: row.label,
    seats: Number(row.seats),
    posX: row.pos_x === null ? null : Number(row.pos_x),
    posY: row.pos_y === null ? null : Number(row.pos_y),
    shape: row.shape,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const BASE_SELECT = `
  SELECT t.id, t.floor_plan_id, t.label, t.seats, t.pos_x, t.pos_y, t.shape, t.status,
         t.created_at, t.updated_at, fp.name AS floor_plan_name
  FROM restaurant_tables t
  LEFT JOIN floor_plans fp ON fp.id = t.floor_plan_id`

async function findByFloorPlan(floorPlanId) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE t.floor_plan_id = ? ORDER BY t.label ASC`, [floorPlanId])
  return rows.map(mapTable)
}

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE t.id = ?`, [id])
  if (!rows.length) return null
  return mapTable(rows[0])
}

// Auto-number new tables T1, T2, ... within a floor plan.
async function nextLabel(conn, floorPlanId) {
  const [rows] = await conn.query(
    `SELECT label FROM restaurant_tables WHERE floor_plan_id = ?
     ORDER BY CAST(SUBSTRING(label, 2) AS UNSIGNED) DESC, label DESC LIMIT 1`,
    [floorPlanId],
  )
  const highest = rows[0] ? Number(String(rows[0].label).replace(/^\D+/, '')) || 0 : 0
  return `T${highest + 1}`
}

async function create({ floorPlanId, label, seats, posX, posY, shape }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const finalLabel = label || (await nextLabel(conn, floorPlanId))
    const [result] = await conn.query(
      `INSERT INTO restaurant_tables (floor_plan_id, label, seats, pos_x, pos_y, shape)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [floorPlanId, finalLabel, Number(seats) || 4, posX ?? null, posY ?? null, shape || 'square'],
    )
    await conn.commit()
    return findById(result.insertId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, { label, seats, posX, posY, shape, status }) {
  const [result] = await pool.query(
    `UPDATE restaurant_tables
     SET label = ?, seats = ?, pos_x = ?, pos_y = ?, shape = ?, status = ?
     WHERE id = ?`,
    [
      label,
      Number(seats) || 4,
      posX ?? null,
      posY ?? null,
      shape || 'square',
      status || 'available',
      id,
    ],
  )
  if (result.affectedRows === 0) throw httpError('Table not found', 404)
  return findById(id)
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM restaurant_tables WHERE id = ?', [id])
  if (result.affectedRows === 0) throw httpError('Table not found', 404)
}

module.exports = { findByFloorPlan, findById, create, update, remove }
