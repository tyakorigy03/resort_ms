const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

async function centersForGroups() {
  const [rows] = await pool.query(
    `SELECT agpc.accounting_group_id AS group_id, pc.id, pc.name
     FROM accounting_group_production_centers agpc
     JOIN production_centers pc ON pc.id = agpc.production_center_id
     ORDER BY pc.name ASC`,
  )
  const map = {}
  for (const row of rows) {
    if (!map[row.group_id]) map[row.group_id] = []
    map[row.group_id].push({ id: row.id, name: row.name })
  }
  return map
}

function shapeGroup(row, centersByGroup) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    itemCount: Number(row.item_count),
    taxProfileId: row.tax_profile_id,
    taxProfileName: row.tax_profile_name || null,
    productionCenters: centersByGroup[row.id] || [],
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT ag.id, ag.name, ag.tax_profile_id, ag.created_at, tp.name AS tax_profile_name,
            COUNT(i.id) AS item_count
     FROM accounting_groups ag
     LEFT JOIN tax_profiles tp ON tp.id = ag.tax_profile_id
     LEFT JOIN items i ON i.accounting_group = ag.name
     GROUP BY ag.id, ag.name, ag.tax_profile_id, ag.created_at, tp.name
     ORDER BY ag.name ASC`,
  )
  const centersByGroup = await centersForGroups()
  return rows.map((row) => shapeGroup(row, centersByGroup))
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ag.id, ag.name, ag.tax_profile_id, ag.created_at, tp.name AS tax_profile_name,
            COUNT(i.id) AS item_count
     FROM accounting_groups ag
     LEFT JOIN tax_profiles tp ON tp.id = ag.tax_profile_id
     LEFT JOIN items i ON i.accounting_group = ag.name
     WHERE ag.id = ?
     GROUP BY ag.id, ag.name, ag.tax_profile_id, ag.created_at, tp.name`,
    [id],
  )
  if (!rows.length) return null
  const centersByGroup = await centersForGroups()
  return shapeGroup(rows[0], centersByGroup)
}

async function syncProductionCenters(conn, groupId, centerIds) {
  await conn.query('DELETE FROM accounting_group_production_centers WHERE accounting_group_id = ?', [groupId])
  const ids = Array.isArray(centerIds) ? centerIds.filter((id) => id) : []
  if (ids.length === 0) return
  for (const centerId of ids) {
    await conn.query(
      'INSERT INTO accounting_group_production_centers (accounting_group_id, production_center_id) VALUES (?, ?)',
      [groupId, Number(centerId)],
    )
  }
}

async function create({ name, taxProfileId, productionCenterIds }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      'INSERT INTO accounting_groups (name, tax_profile_id) VALUES (?, ?)',
      [name, taxProfileId || null],
    )
    await syncProductionCenters(conn, result.insertId, productionCenterIds)
    await conn.commit()
    return findById(result.insertId)
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

async function update(id, { name, taxProfileId, productionCenterIds }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      'UPDATE accounting_groups SET name = ?, tax_profile_id = ? WHERE id = ?',
      [name, taxProfileId || null, id],
    )
    if (result.affectedRows === 0) throw httpError('Accounting group not found', 404)
    await syncProductionCenters(conn, id, productionCenterIds)
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
  const [rows] = await pool.query('SELECT name FROM accounting_groups WHERE id = ?', [id])
  if (!rows.length) throw httpError('Accounting group not found', 404)
  const [used] = await pool.query('SELECT COUNT(*) AS total FROM items WHERE accounting_group = ?', [
    rows[0].name,
  ])
  if (used[0].total > 0) {
    throw httpError(`Group is used by ${used[0].total} item(s); reassign them first`, 409)
  }
  await pool.query('DELETE FROM accounting_groups WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
