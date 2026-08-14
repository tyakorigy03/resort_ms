const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

async function findAll({ groupId } = {}) {
  const params = []
  let where = ''
  if (groupId) {
    where = 'WHERE m.modifier_group_id = ?'
    params.push(groupId)
  }
  const [rows] = await pool.query(
    `SELECT m.id, m.modifier_group_id, m.name, m.price, m.sort_order, mg.name AS group_name
     FROM modifiers m
     JOIN modifier_groups mg ON mg.id = m.modifier_group_id
     ${where}
     ORDER BY mg.name ASC, m.sort_order ASC, m.name ASC`,
    params,
  )
  return rows.map((r) => ({
    id: r.id,
    modifierGroupId: r.modifier_group_id,
    groupName: r.group_name,
    name: r.name,
    price: Number(r.price),
    sortOrder: Number(r.sort_order),
  }))
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT m.id, m.modifier_group_id, m.name, m.price, m.sort_order, mg.name AS group_name
     FROM modifiers m
     JOIN modifier_groups mg ON mg.id = m.modifier_group_id
     WHERE m.id = ?`,
    [id],
  )
  if (!rows.length) return null
  return {
    id: rows[0].id,
    modifierGroupId: rows[0].modifier_group_id,
    groupName: rows[0].group_name,
    name: rows[0].name,
    price: Number(rows[0].price),
    sortOrder: Number(rows[0].sort_order),
  }
}

async function create({ modifierGroupId, name, price, sortOrder }) {
  const [result] = await pool.query(
    'INSERT INTO modifiers (modifier_group_id, name, price, sort_order) VALUES (?, ?, ?, ?)',
    [modifierGroupId, name, price ?? 0, sortOrder ?? 0],
  )
  return findById(result.insertId)
}

async function update(id, { modifierGroupId, name, price, sortOrder }) {
  const [result] = await pool.query(
    'UPDATE modifiers SET modifier_group_id = ?, name = ?, price = ?, sort_order = ? WHERE id = ?',
    [modifierGroupId, name, price ?? 0, sortOrder ?? 0, id],
  )
  if (result.affectedRows === 0) throw httpError('Modifier not found', 404)
  return findById(id)
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM modifiers WHERE id = ?', [id])
  if (result.affectedRows === 0) throw httpError('Modifier not found', 404)
}

module.exports = { findAll, findById, create, update, remove }
