const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapRatePlan(row, ratesByPlan) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    rates: ratesByPlan[row.id] || [],
  }
}

async function ratesForPlans() {
  const [rows] = await pool.query(
    `SELECT rpp.rate_plan_id AS plan_id, rpp.room_type_id, rpp.rate, rt.name AS room_type_name
     FROM rate_plan_prices rpp
     JOIN room_types rt ON rt.id = rpp.room_type_id
     ORDER BY rt.name ASC`,
  )
  const map = {}
  for (const row of rows) {
    if (!map[row.plan_id]) map[row.plan_id] = []
    map[row.plan_id].push({
      roomTypeId: row.room_type_id,
      roomTypeName: row.room_type_name,
      rate: Number(row.rate),
    })
  }
  return map
}

async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, name, code, description, is_active, created_at FROM rate_plans ORDER BY name ASC',
  )
  const ratesByPlan = await ratesForPlans()
  return rows.map((row) => mapRatePlan(row, ratesByPlan))
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, code, description, is_active, created_at FROM rate_plans WHERE id = ?',
    [id],
  )
  if (!rows.length) return null
  const ratesByPlan = await ratesForPlans()
  return mapRatePlan(rows[0], ratesByPlan)
}

async function syncRates(conn, planId, rates) {
  await conn.query('DELETE FROM rate_plan_prices WHERE rate_plan_id = ?', [planId])
  const items = Array.isArray(rates) ? rates : []
  for (const item of items) {
    if (!item.roomTypeId) continue
    await conn.query(
      'INSERT INTO rate_plan_prices (rate_plan_id, room_type_id, rate) VALUES (?, ?, ?)',
      [planId, Number(item.roomTypeId), Number(item.rate) || 0],
    )
  }
}

async function create({ name, code, description, rates }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      'INSERT INTO rate_plans (name, code, description) VALUES (?, ?, ?)',
      [name, code || null, description || null],
    )
    await syncRates(conn, result.insertId, rates)
    await conn.commit()
    return findById(result.insertId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, { name, code, description, rates, isActive }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      'UPDATE rate_plans SET name = ?, code = ?, description = ?, is_active = ? WHERE id = ?',
      [name, code || null, description || null, isActive ? 1 : 0, id],
    )
    if (result.affectedRows === 0) throw httpError('Rate plan not found', 404)
    await syncRates(conn, id, rates)
    await conn.commit()
    return findById(id)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM rate_plans WHERE id = ?', [id])
  if (!rows.length) throw httpError('Rate plan not found', 404)
  await pool.query('DELETE FROM rate_plans WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
