const crypto = require('crypto')
const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')
const { sendMail } = require('../utils/mailer')

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

async function lookupByRoom(roomNumber) {
  if (!roomNumber) throw httpError('Room number is required', 400)
  const [rows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.room_id, rv.room_type_id, rv.rate_plan_id,
            DATE_FORMAT(rv.check_in_date, '%Y-%m-%dT%H:%i') AS check_in_date,
            DATE_FORMAT(rv.check_out_date, '%Y-%m-%dT%H:%i') AS check_out_date,
            rv.status, rv.adults, rv.children,
            c.first_name, c.last_name, c.email, c.phone,
            r.room_number,
            rt.name AS room_type_name,
            rp.name AS rate_plan_name
     FROM reservations rv
     JOIN customers c ON c.id = rv.customer_id
     JOIN rooms r ON r.id = rv.room_id
     LEFT JOIN room_types rt ON rt.id = rv.room_type_id
     LEFT JOIN rate_plans rp ON rp.id = rv.rate_plan_id
     WHERE r.room_number = ? AND rv.status IN ('booked', 'checked_in')
     ORDER BY rv.check_in_date DESC
     LIMIT 1`,
    [roomNumber],
  )
  if (!rows.length) throw httpError('No active reservation found for this room', 404)
  return rows[0]
}

async function requestOtp(reservationId) {
  const [rows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.email, rv.guest_name FROM (
       SELECT rv.id, rv.customer_id, c.email, CONCAT_WS(' ', c.first_name, c.last_name) AS guest_name
       FROM reservations rv
       JOIN customers c ON c.id = rv.customer_id
       WHERE rv.id = ?
     ) rv
     WHERE rv.email IS NOT NULL AND rv.email != ''`,
    [reservationId],
  )
  if (!rows.length) throw httpError('No email found for this reservation', 404)

  const reservation = rows[0]
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await pool.query(
    `INSERT INTO guest_otps (reservation_id, email, code, expires_at) VALUES (?, ?, ?, ?)`,
    [reservationId, reservation.email, code, expiresAt],
  )

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #166534; text-align: center;">Resort Guest Portal</h2>
      <p>Hello <strong>${reservation.guest_name}</strong>,</p>
      <p>Your verification code is:</p>
      <div style="text-align: center; padding: 20px; margin: 20px 0; background: #f1f5f9; border-radius: 10px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #166534;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
    </div>
  `

  const result = await sendMail({
    to: reservation.email,
    subject: 'Your Resort Verification Code',
    html,
  })

  return {
    email: reservation.email,
    sent: result.sent,
    reason: result.reason,
    code: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

async function verifyOtp(reservationId, code) {
  if (!code) throw httpError('Verification code is required', 400)

  const [rows] = await pool.query(
    `SELECT id FROM guest_otps
     WHERE reservation_id = ? AND code = ? AND verified = 0 AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [reservationId, code],
  )
  if (!rows.length) throw httpError('Invalid or expired verification code', 401)

  await pool.query('UPDATE guest_otps SET verified = 1 WHERE id = ?', [rows[0].id])

  return { verified: true }
}

async function guestDashboard(reservationId) {
  const [rows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.room_id, rv.room_type_id, rv.rate_plan_id,
            DATE_FORMAT(rv.check_in_date, '%Y-%m-%dT%H:%i') AS check_in_date,
            DATE_FORMAT(rv.check_out_date, '%Y-%m-%dT%H:%i') AS check_out_date,
            rv.status, rv.adults, rv.children, rv.source, rv.notes,
            rv.created_at, rv.updated_at,
            c.first_name, c.last_name, c.email, c.phone,
            r.room_number, r.floor,
            rt.name AS room_type_name, rt.base_rate,
            rp.name AS rate_plan_name
     FROM reservations rv
     JOIN customers c ON c.id = rv.customer_id
     LEFT JOIN rooms r ON r.id = rv.room_id
     LEFT JOIN room_types rt ON rt.id = rv.room_type_id
     LEFT JOIN rate_plans rp ON rp.id = rv.rate_plan_id
     WHERE rv.id = ?`,
    [reservationId],
  )
  if (!rows.length) throw httpError('Reservation not found', 404)

  const r = rows[0]
  const ms = new Date(r.check_out_date) - new Date(r.check_in_date)
  const nights = Math.max(0, Math.round((ms / 86400000) * 100) / 100)

  let folio = null
  const [folioRows] = await pool.query(
    `SELECT f.id, f.status, f.balance
     FROM folios f
     WHERE f.reservation_id = ? ORDER BY f.id DESC LIMIT 1`,
    [reservationId],
  )
  if (folioRows.length) {
    folio = folioRows[0]
    const [lines] = await pool.query(
      `SELECT fl.id, fl.type, fl.description, fl.amount, fl.created_at
       FROM folio_line_items fl
       WHERE fl.folio_id = ?
       ORDER BY fl.created_at ASC`,
      [folio.id],
    )
    folio.lines = lines
  }

  return {
    id: r.id,
    guestName: `${r.first_name} ${r.last_name}`.trim(),
    email: r.email,
    phone: r.phone,
    roomNumber: r.room_number,
    floor: r.floor,
    roomType: r.room_type_name,
    ratePlan: r.rate_plan_name,
    checkInDate: r.check_in_date,
    checkOutDate: r.check_out_date,
    nights,
    adults: Number(r.adults),
    children: Number(r.children),
    status: r.status,
    source: r.source,
    notes: r.notes,
    baseRate: Number(r.base_rate),
    createdAt: r.created_at,
    folio,
  }
}

module.exports = { lookupByRoom, requestOtp, verifyOtp, guestDashboard }
