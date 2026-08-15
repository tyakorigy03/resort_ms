const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapPlan(row) {
  return {
    id: row.id,
    outletId: row.outlet_id,
    outletName: row.outlet_name || null,
    name: row.name,
    orderProfileId: row.order_profile_id || null,
    promptCoverCount: row.prompt_cover_count ? Boolean(row.prompt_cover_count) : true,
    backgroundImageUrl: row.background_image_url || null,
    sortOrder: Number(row.sort_order),
    tableCount: Number(row.table_count || 0),
    totalSeats: Number(row.total_seats || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const BASE_SELECT = `
  SELECT fp.id, fp.outlet_id, fp.name, fp.order_profile_id, fp.prompt_cover_count,
         fp.background_image_url, fp.sort_order, fp.created_at, fp.updated_at,
         o.name AS outlet_name,
         (SELECT COUNT(*) FROM restaurant_tables t WHERE t.floor_plan_id = fp.id) AS table_count,
         (SELECT COALESCE(SUM(t.seats), 0) FROM restaurant_tables t WHERE t.floor_plan_id = fp.id) AS total_seats
  FROM floor_plans fp
  LEFT JOIN outlets o ON o.id = fp.outlet_id`

async function findAll() {
  const [rows] = await pool.query(`${BASE_SELECT} ORDER BY fp.sort_order ASC, fp.name ASC`)
  return rows.map(mapPlan)
}

async function findByOutlet(outletId) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE fp.outlet_id = ? ORDER BY fp.sort_order ASC, fp.name ASC`, [
    outletId,
  ])
  return rows.map(mapPlan)
}

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE fp.id = ?`, [id])
  if (!rows.length) return null
  return mapPlan(rows[0])
}

async function create({ outletId, name, orderProfileId, promptCoverCount, backgroundImageUrl, sortOrder }) {
  const [result] = await pool.query(
    `INSERT INTO floor_plans (outlet_id, name, order_profile_id, prompt_cover_count, background_image_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      outletId,
      name,
      orderProfileId || null,
      promptCoverCount === undefined || promptCoverCount === null ? 1 : promptCoverCount ? 1 : 0,
      backgroundImageUrl || null,
      Number(sortOrder) || 0,
    ],
  )
  return findById(result.insertId)
}

async function update(id, { name, orderProfileId, promptCoverCount, backgroundImageUrl, sortOrder }) {
  const [result] = await pool.query(
    `UPDATE floor_plans
     SET name = ?, order_profile_id = ?, prompt_cover_count = ?, background_image_url = ?, sort_order = ?
     WHERE id = ?`,
    [
      name,
      orderProfileId || null,
      promptCoverCount === undefined || promptCoverCount === null ? 1 : promptCoverCount ? 1 : 0,
      backgroundImageUrl || null,
      Number(sortOrder) || 0,
      id,
    ],
  )
  if (result.affectedRows === 0) throw httpError('Floor plan not found', 404)
  return findById(id)
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM floor_plans WHERE id = ?', [id])
  if (result.affectedRows === 0) throw httpError('Floor plan not found', 404)
}

module.exports = { findAll, findByOutlet, findById, create, update, remove }
