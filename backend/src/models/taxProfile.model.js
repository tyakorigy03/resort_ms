const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapTaxProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    rate: Number(row.rate),
    taxType: row.tax_type,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, name, rate, tax_type, is_default, is_active, created_at FROM tax_profiles ORDER BY is_default DESC, name ASC',
  )
  return rows.map(mapTaxProfile)
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, rate, tax_type, is_default, is_active, created_at FROM tax_profiles WHERE id = ?',
    [id],
  )
  return mapTaxProfile(rows[0])
}

async function clearDefault() {
  await pool.query('UPDATE tax_profiles SET is_default = 0 WHERE is_default = 1')
}

async function create({ name, rate, taxType, isActive }) {
  const useDefault = Number(rate) > 0
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (useDefault) await conn.query('UPDATE tax_profiles SET is_default = 0 WHERE is_default = 1')
    const [result] = await conn.query(
      'INSERT INTO tax_profiles (name, rate, tax_type, is_default, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, Number(rate) || 0, taxType || 'inclusive', useDefault ? 1 : 0, isActive === undefined ? 1 : isActive ? 1 : 0],
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

async function update(id, { name, rate, taxType, isDefault, isActive }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (isDefault) await conn.query('UPDATE tax_profiles SET is_default = 0 WHERE is_default = 1')
    const [result] = await conn.query(
      'UPDATE tax_profiles SET name = ?, rate = ?, tax_type = ?, is_default = ?, is_active = ? WHERE id = ?',
      [name, Number(rate) || 0, taxType || 'inclusive', isDefault ? 1 : 0, isActive ? 1 : 0, id],
    )
    if (result.affectedRows === 0) throw httpError('Tax profile not found', 404)
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
  const [rows] = await pool.query('SELECT id FROM tax_profiles WHERE id = ?', [id])
  if (!rows.length) throw httpError('Tax profile not found', 404)
  await pool.query('DELETE FROM tax_profiles WHERE id = ?', [id])
}

module.exports = { findAll, findById, create, update, remove }
