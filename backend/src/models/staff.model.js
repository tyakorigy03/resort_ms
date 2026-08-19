const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

const BASE_COLUMNS = `
  s.id, s.first_name, s.last_name, s.position, s.role_id, s.department, s.phone, s.email,
  s.hire_date, s.qr_code, s.notes, s.is_active, s.created_at, s.user_id,
  u.name AS user_name, u.email AS user_email, u.role AS user_role,
  sr.name AS role_name
`

const STAFF_JOIN = `
  FROM staff s
  LEFT JOIN users u ON u.id = s.user_id
  LEFT JOIN staff_roles sr ON sr.id = s.role_id
`

function mapStaff(row) {
  if (!row) return null
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    position: row.position,
    roleId: row.role_id || null,
    roleName: row.role_name || null,
    department: row.department,
    phone: row.phone,
    email: row.email,
    hireDate: row.hire_date,
    qrCode: row.qr_code,
    hasPin: Boolean(row.has_pin),
    userId: row.user_id || null,
    userName: row.user_name || null,
    userEmail: row.user_email || null,
    userRole: row.user_role || null,
    notes: row.notes,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }
}

function generateQrCode() {
  return crypto.randomBytes(24).toString('base64url')
}

async function findAll({ activeOnly = false } = {}) {
  const where = activeOnly ? 'WHERE s.is_active = 1' : ''
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, (s.pin IS NOT NULL) AS has_pin ${STAFF_JOIN} ${where} ORDER BY s.last_name ASC, s.first_name ASC`,
  )
  return rows.map(mapStaff)
}

// Minimal active-staff list for POS clock-in screens. Deliberately excludes
// qr_code and pin — only what a device needs to let a cashier pick themselves.
async function findActiveMinimal() {
  const [rows] = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, s.position, s.role_id, sr.name AS role_name, u.role AS user_role, (s.pin IS NOT NULL) AS has_pin
     ${STAFF_JOIN} WHERE s.is_active = 1 ORDER BY s.last_name ASC, s.first_name ASC`,
  )
  return rows.map((row) => ({
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    position: row.position || null,
    roleId: row.role_id || null,
    roleName: row.role_name || null,
    userRole: row.user_role || null,
    hasPin: Boolean(row.has_pin),
  }))
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, (s.pin IS NOT NULL) AS has_pin ${STAFF_JOIN} WHERE s.id = ?`,
    [id],
  )
  return mapStaff(rows[0])
}

async function findByQrCode(qrCode) {
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, (s.pin IS NOT NULL) AS has_pin ${STAFF_JOIN} WHERE s.qr_code = ?`,
    [qrCode],
  )
  return mapStaff(rows[0])
}

async function findByIdWithPin(id) {
  const [rows] = await pool.query('SELECT id, first_name, last_name, pin, is_active FROM staff WHERE id = ?', [id])
  return rows[0] || null
}

async function create({ firstName, lastName, position, roleId, department, phone, email, hireDate, notes, userId }) {
  const [result] = await pool.query(
    'INSERT INTO staff (first_name, last_name, position, role_id, department, phone, email, hire_date, qr_code, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [firstName, lastName, position || null, roleId || null, department || null, phone || null, email || null, hireDate || null, generateQrCode(), notes || null, userId || null],
  )
  return findById(result.insertId)
}

async function update(id, { firstName, lastName, position, roleId, department, phone, email, hireDate, notes, isActive, userId }) {
  const [result] = await pool.query(
    `UPDATE staff
     SET first_name = ?, last_name = ?, position = ?, role_id = ?, department = ?, phone = ?, email = ?, hire_date = ?, notes = ?, is_active = ?, user_id = ?
     WHERE id = ?`,
    [firstName, lastName, position || null, roleId || null, department || null, phone || null, email || null, hireDate || null, notes || null, isActive ? 1 : 0, userId || null, id],
  )
  if (result.affectedRows === 0) throw httpError('Staff member not found', 404)
  return findById(id)
}

async function linkUser(staffId, userId) {
  const staff = await findById(staffId)
  if (!staff) throw httpError('Staff member not found', 404)
  const [userRows] = await pool.query('SELECT id FROM users WHERE id = ?', [userId])
  if (!userRows.length) throw httpError('User not found', 404)
  const [linked] = await pool.query('SELECT id FROM staff WHERE user_id = ? AND id <> ?', [userId, staffId])
  if (linked.length) throw httpError('User is already linked to another staff member', 409)
  await pool.query('UPDATE staff SET user_id = ? WHERE id = ?', [userId, staffId])
  return findById(staffId)
}

async function unlinkUser(staffId) {
  const [result] = await pool.query('UPDATE staff SET user_id = NULL WHERE id = ?', [staffId])
  if (result.affectedRows === 0) throw httpError('Staff member not found', 404)
  return findById(staffId)
}

async function remove(id) {
  const [rows] = await pool.query('SELECT id FROM staff WHERE id = ?', [id])
  if (!rows.length) throw httpError('Staff member not found', 404)
  await pool.query('DELETE FROM staff WHERE id = ?', [id])
}

async function setPin(id, pin) {
  const hashed = await bcrypt.hash(String(pin), 10)
  const [result] = await pool.query('UPDATE staff SET pin = ? WHERE id = ?', [hashed, id])
  if (result.affectedRows === 0) throw httpError('Staff member not found', 404)
}

async function verifyPin(staff, pin) {
  if (!staff.pin) return false
  return bcrypt.compare(String(pin), staff.pin)
}

async function getQrCode(id) {
  const [rows] = await pool.query('SELECT qr_code FROM staff WHERE id = ?', [id])
  if (!rows.length) throw httpError('Staff member not found', 404)
  if (rows[0].qr_code) return rows[0].qr_code
  const qr = generateQrCode()
  await pool.query('UPDATE staff SET qr_code = ? WHERE id = ?', [qr, id])
  return qr
}

async function listRoles() {
  const [rows] = await pool.query('SELECT id, name, description FROM staff_roles ORDER BY name ASC')
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || null,
  }))
}

async function hasPermission(staffId, permission) {
  if (!staffId) return false
  const [rows] = await pool.query(
    `SELECT 1 FROM staff s
     JOIN role_permissions rp ON rp.role_id = s.role_id
     WHERE s.id = ? AND rp.permission = ? LIMIT 1`,
    [staffId, permission],
  )
  return rows.length > 0
}

// Active staff who hold a given permission (used by the POS to pick who may
// open/close a sales period). Never exposes pins or QR codes.
async function findManagers(permission) {
  const [rows] = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, (s.pin IS NOT NULL) AS has_pin
     FROM staff s
     JOIN role_permissions rp ON rp.role_id = s.role_id
     WHERE rp.permission = ? AND s.is_active = 1
     ORDER BY s.last_name ASC, s.first_name ASC`,
    [permission],
  )
  return rows.map((row) => ({
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    hasPin: Boolean(row.has_pin),
  }))
}

// Resolve the single active manager whose PIN matches, among those holding the
// permission. Wrong PIN -> null; multiple matches -> 409; none configured -> 409.
async function findManagerByPin(pin, permission) {
  if (!pin) return null
  const [rows] = await pool.query(
    `SELECT s.id, s.pin FROM staff s
     JOIN role_permissions rp ON rp.role_id = s.role_id
     WHERE rp.permission = ? AND s.is_active = 1 AND s.pin IS NOT NULL`,
    [permission],
  )
  if (!rows.length) {
    throw httpError('No manager is configured to open or close sales periods', 409)
  }
  const matches = []
  for (const row of rows) {
    if (await bcrypt.compare(String(pin), row.pin)) matches.push(row.id)
  }
  if (matches.length > 1) {
    throw httpError('That PIN matches more than one manager', 409)
  }
  return matches[0] || null
}

async function findByPin(pin) {
  if (!pin) return null
  const [rows] = await pool.query(
    'SELECT id, pin FROM staff WHERE is_active = 1 AND pin IS NOT NULL',
  )
  for (const row of rows) {
    if (await bcrypt.compare(String(pin), row.pin)) {
      return findById(row.id)
    }
  }
  return null
}

module.exports = {
  findAll,
  findActiveMinimal,
  findById,
  findByQrCode,
  findByIdWithPin,
  findByPin,
  create,
  update,
  remove,
  setPin,
  verifyPin,
  getQrCode,
  linkUser,
  unlinkUser,
  listRoles,
  hasPermission,
  findManagers,
  findManagerByPin,
}
