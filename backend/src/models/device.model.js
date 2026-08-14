const bcrypt = require('bcryptjs')
const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

const BASE_COLUMNS =
  'd.id, d.name, d.device_type, d.code, d.outlet_id, d.production_center_id, d.ip_address, d.config, d.is_active, d.created_at'

function parseConfig(raw) {
  if (raw === null || raw === undefined) return null
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

function mapDevice(row, withHasPin = true) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    deviceType: row.device_type,
    code: row.code,
    hasPin: withHasPin ? Boolean(row.has_pin) : undefined,
    outletId: row.outlet_id,
    outletName: row.outlet_name || null,
    productionCenterId: row.production_center_id,
    productionCenterName: row.pc_name || null,
    ipAddress: row.ip_address,
    config: parseConfig(row.config),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, o.name AS outlet_name, pc.name AS pc_name, (d.pin IS NOT NULL) AS has_pin
     FROM devices d
     LEFT JOIN outlets o ON o.id = d.outlet_id
     LEFT JOIN production_centers pc ON pc.id = d.production_center_id
     ORDER BY d.name ASC`,
  )
  return rows.map(mapDevice)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, o.name AS outlet_name, pc.name AS pc_name, (d.pin IS NOT NULL) AS has_pin
     FROM devices d
     LEFT JOIN outlets o ON o.id = d.outlet_id
     LEFT JOIN production_centers pc ON pc.id = d.production_center_id
     WHERE d.id = ?`,
    [id],
  )
  return mapDevice(rows[0])
}

async function findByCode(code) {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, o.name AS outlet_name, pc.name AS pc_name, (d.pin IS NOT NULL) AS has_pin
     FROM devices d
     LEFT JOIN outlets o ON o.id = d.outlet_id
     LEFT JOIN production_centers pc ON pc.id = d.production_center_id
     WHERE d.code = ?`,
    [code],
  )
  return mapDevice(rows[0])
}

async function findByCodeWithPin(code) {
  const [rows] = await pool.query(
    'SELECT id, name, code, pin, outlet_id, production_center_id, device_type, is_active FROM devices WHERE code = ?',
    [code],
  )
  return rows[0] || null
}

async function create({ name, deviceType, code, pin, outletId, productionCenterId, ipAddress, config, isActive }) {
  const hashedPin = pin ? await bcrypt.hash(String(pin), 10) : null
  const [result] = await pool.query(
    'INSERT INTO devices (name, device_type, code, pin, outlet_id, production_center_id, ip_address, config, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, deviceType || 'pos', code || null, hashedPin, outletId || null, productionCenterId || null, ipAddress || null, config ? JSON.stringify(config) : null, isActive === undefined ? 1 : isActive ? 1 : 0],
  )
  return findById(result.insertId)
}

async function update(id, { name, deviceType, code, pin, outletId, productionCenterId, ipAddress, config, isActive }) {
  const [currentRows] = await pool.query('SELECT pin FROM devices WHERE id = ?', [id])
  if (!currentRows.length) throw httpError('Device not found', 404)
  const storedPin = pin ? await bcrypt.hash(String(pin), 10) : currentRows[0].pin
  const [result] = await pool.query(
    'UPDATE devices SET name = ?, device_type = ?, code = ?, pin = ?, outlet_id = ?, production_center_id = ?, ip_address = ?, config = ?, is_active = ? WHERE id = ?',
    [name, deviceType || 'pos', code || null, storedPin, outletId || null, productionCenterId || null, ipAddress || null, config ? JSON.stringify(config) : null, isActive ? 1 : 0, id],
  )
  if (result.affectedRows === 0) throw httpError('Device not found', 404)
  return findById(id)
}

async function setPin(id, pin) {
  const hashed = await bcrypt.hash(String(pin), 10)
  const [result] = await pool.query('UPDATE devices SET pin = ? WHERE id = ?', [hashed, id])
  if (result.affectedRows === 0) throw httpError('Device not found', 404)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM devices WHERE id = ?', [id])
  if (!rows.length) throw httpError('Device not found', 404)
  await pool.query('DELETE FROM devices WHERE id = ?', [id])
}

module.exports = { findAll, findById, findByCode, findByCodeWithPin, create, update, setPin, remove }
