const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

async function findAll() {
  const [rows] = await pool.query(
    `SELECT mg.id, mg.name, mg.selection_type, mg.min_select, mg.max_select, mg.created_at,
            COUNT(m.id) AS modifier_count
     FROM modifier_groups mg
     LEFT JOIN modifiers m ON m.modifier_group_id = mg.id
     GROUP BY mg.id, mg.name, mg.selection_type, mg.min_select, mg.max_select, mg.created_at
     ORDER BY mg.name ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    selectionType: r.selection_type,
    minSelect: Number(r.min_select),
    maxSelect: Number(r.max_select),
    modifierCount: Number(r.modifier_count),
  }))
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, selection_type, min_select, max_select FROM modifier_groups WHERE id = ?',
    [id],
  )
  if (!rows.length) return null
  return {
    id: rows[0].id,
    name: rows[0].name,
    selectionType: rows[0].selection_type,
    minSelect: Number(rows[0].min_select),
    maxSelect: Number(rows[0].max_select),
  }
}

async function create({ name, selectionType, minSelect, maxSelect }) {
  const [result] = await pool.query(
    'INSERT INTO modifier_groups (name, selection_type, min_select, max_select) VALUES (?, ?, ?, ?)',
    [name, selectionType || 'single', minSelect ?? 1, maxSelect ?? 1],
  )
  return findById(result.insertId)
}

async function update(id, { name, selectionType, minSelect, maxSelect }) {
  const [result] = await pool.query(
    'UPDATE modifier_groups SET name = ?, selection_type = ?, min_select = ?, max_select = ? WHERE id = ?',
    [name, selectionType || 'single', minSelect ?? 1, maxSelect ?? 1, id],
  )
  if (result.affectedRows === 0) throw httpError('Modifier group not found', 404)
  return findById(id)
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM modifier_groups WHERE id = ?', [id])
  if (result.affectedRows === 0) throw httpError('Modifier group not found', 404)
}

module.exports = { findAll, findById, create, update, remove }
