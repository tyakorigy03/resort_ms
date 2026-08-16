const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

const BASE_SELECT = `
  SELECT rv.id, rv.customer_id, rv.room_id, rv.room_type_id, rv.rate_plan_id,
         rv.check_in_date, rv.check_out_date, rv.adults, rv.children, rv.status, rv.source, rv.notes,
         rv.created_at, rv.updated_at,
         c.first_name, c.last_name, c.email, c.phone,
         CONCAT_WS(' ', c.first_name, c.last_name) AS guest_name,
         rt.name AS room_type_name,
         r.room_number,
         rp.name AS rate_plan_name
  FROM reservations rv
  JOIN customers c ON c.id = rv.customer_id
  LEFT JOIN room_types rt ON rt.id = rv.room_type_id
  LEFT JOIN rooms r ON r.id = rv.room_id
  LEFT JOIN rate_plans rp ON rp.id = rv.rate_plan_id`

function nightsFor(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  return Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function dateSeries(startDate, days) {
  const dates = []
  for (let i = 0; i < days; i++) dates.push(addDays(startDate, i))
  return dates
}

function mapReservation(row, openFolioId) {
  if (!row) return null
  return {
    id: row.id,
    customerId: row.customer_id,
    firstName: row.first_name,
    lastName: row.last_name,
    guestName: row.guest_name,
    email: row.email,
    phone: row.phone,
    roomId: row.room_id,
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name || null,
    ratePlanId: row.rate_plan_id,
    ratePlanName: row.rate_plan_name || null,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    nights: nightsFor(row.check_in_date, row.check_out_date),
    adults: Number(row.adults),
    children: Number(row.children),
    status: row.status,
    source: row.source || null,
    notes: row.notes,
    roomNumber: row.room_number || null,
    folioId: openFolioId || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function openFolioIdFor(reservationId) {
  if (!reservationId) return null
  const [rows] = await pool.query(
    "SELECT id FROM folios WHERE reservation_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1",
    [reservationId],
  )
  return rows[0]?.id || null
}

async function findAll({ status, checkInDate, checkOutDate, search, limit } = {}) {
  const conditions = []
  const params = []
  if (status) {
    const list = Array.isArray(status) ? status : [status]
    conditions.push(`rv.status IN (${list.map(() => '?').join(', ')})`)
    params.push(...list)
  }
  if (checkInDate) {
    conditions.push('rv.check_in_date = ?')
    params.push(checkInDate)
  }
  if (checkOutDate) {
    conditions.push('rv.check_out_date = ?')
    params.push(checkOutDate)
  }
  if (search) {
    conditions.push('(CONCAT_WS(\' \', c.first_name, c.last_name) LIKE ? OR r.room_number LIKE ? OR rv.notes LIKE ?)')
    const q = `%${search}%`
    params.push(q, q, q)
  }
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE ${conditions.length ? conditions.join(' AND ') : '1 = 1'}
     ORDER BY rv.check_in_date ASC, rv.id DESC
     LIMIT ?`,
    [...params, Math.min(Number(limit) || 200, 500)],
  )
  const folioIds = {}
  for (const row of rows) folioIds[row.id] = await openFolioIdFor(row.id)
  return rows.map((row) => mapReservation(row, folioIds[row.id]))
}

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE rv.id = ?`, [id])
  return mapReservation(rows[0], await openFolioIdFor(rows[0]?.id))
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseCount(value) {
  return value === undefined || value === null || value === '' ? null : Number(value)
}

// Validate that a room can hold a reservation with the given type/dates, then
// return the room row. `query` is either pool.query or a connection query so
// callers inside transactions can reuse it.
async function validateRoomAssignment(query, roomId, roomTypeId, checkInDate, checkOutDate, excludeReservationId) {
  const [rooms] = await query('SELECT * FROM rooms WHERE id = ?', [Number(roomId)])
  const room = rooms[0]
  if (!room || !room.is_active) throw httpError('Room not found or inactive', 400)
  if (room.room_type_id !== Number(roomTypeId)) {
    throw httpError('Room does not match the reserved room type', 400)
  }
  const [overlaps] = await query(
    `SELECT rv.id FROM reservations rv
     WHERE rv.room_id = ? AND rv.status IN ('booked', 'checked_in')
       AND rv.id <> ? AND rv.check_in_date < ? AND rv.check_out_date > ?`,
    [Number(roomId), Number(excludeReservationId) || 0, checkOutDate, checkInDate],
  )
  if (overlaps.length) throw httpError('Room has an overlapping reservation', 400)
  return room
}

// Recompute a room's status after a booking moved off it: 'occupied' is only
// ever set by check-in and is cleared by check-out, so freeing a booking room
// either leaves it 'reserved' (another booking holds it) or 'available'.
async function freeRoom(query, roomId, excludeReservationId) {
  if (!roomId) return
  const [overlaps] = await query(
    `SELECT rv.id FROM reservations rv
     WHERE rv.room_id = ? AND rv.status IN ('booked', 'checked_in') AND rv.id <> ?
     LIMIT 1`,
    [Number(roomId), Number(excludeReservationId) || 0],
  )
  await query('UPDATE rooms SET status = ? WHERE id = ?', [overlaps.length ? 'reserved' : 'available', Number(roomId)])
}

async function create(data) {
  const {
    customerId, roomTypeId, ratePlanId, checkInDate, checkOutDate,
    adults, children, source, notes, roomId,
  } = data
  if (!customerId || !roomTypeId || !checkInDate || !checkOutDate) {
    throw httpError('Guest, room type, check-in and check-out dates are required', 400)
  }
  if (!DATE_RE.test(checkInDate) || !DATE_RE.test(checkOutDate)) {
    throw httpError('Check-in and check-out dates must be YYYY-MM-DD', 400)
  }
  if (new Date(checkOutDate) <= new Date(checkInDate)) {
    throw httpError('Check-out must be after check-in', 400)
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const assignedRoomId = roomId ? Number(roomId) : null
    if (assignedRoomId) {
      await validateRoomAssignment(conn.query.bind(conn), assignedRoomId, roomTypeId, checkInDate, checkOutDate, null)
      await conn.query("UPDATE rooms SET status = 'reserved' WHERE id = ?", [assignedRoomId])
    }
    const [result] = await conn.query(
      `INSERT INTO reservations
         (customer_id, room_id, room_type_id, rate_plan_id, check_in_date, check_out_date, adults, children, source, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(customerId),
        assignedRoomId,
        Number(roomTypeId),
        ratePlanId ? Number(ratePlanId) : null,
        checkInDate,
        checkOutDate,
        parseCount(adults) ?? 1,
        parseCount(children) ?? 0,
        source || null,
        notes || null,
      ],
    )
    await conn.commit()
    return findById(result.insertId)
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function update(id, data) {
  const current = await findById(id)
  if (!current) throw httpError('Reservation not found', 404)
  if (!['booked', 'checked_in'].includes(current.status)) {
    throw httpError('Only booked or in-house reservations can be edited', 400)
  }
  const nextRoomTypeId = data.roomTypeId !== undefined ? Number(data.roomTypeId) || null : current.roomTypeId
  const nextCheckIn = data.checkInDate !== undefined ? data.checkInDate : current.checkInDate
  const nextCheckOut = data.checkOutDate !== undefined ? data.checkOutDate : current.checkOutDate
  if ((data.checkInDate !== undefined || data.checkOutDate !== undefined) &&
      (!DATE_RE.test(nextCheckIn) || !DATE_RE.test(nextCheckOut))) {
    throw httpError('Check-in and check-out dates must be YYYY-MM-DD', 400)
  }
  if (new Date(nextCheckOut) <= new Date(nextCheckIn)) {
    throw httpError('Check-out must be after check-in', 400)
  }

  let nextRoomId = current.roomId
  if (data.roomId !== undefined) {
    if (current.status === 'checked_in') {
      throw httpError('In-house guests cannot change rooms from the booking form', 400)
    }
    nextRoomId = data.roomId ? Number(data.roomId) : null
  } else if (current.roomId && current.roomTypeId !== nextRoomTypeId) {
    nextRoomId = null
  }

  const fields = []
  const params = []
  const push = (col, val) => { fields.push(`${col} = ?`); params.push(val) }
  if (data.roomTypeId !== undefined) push('room_type_id', nextRoomTypeId)
  if (data.ratePlanId !== undefined) push('rate_plan_id', data.ratePlanId ? Number(data.ratePlanId) : null)
  if (data.checkInDate !== undefined) push('check_in_date', nextCheckIn)
  if (data.checkOutDate !== undefined) push('check_out_date', nextCheckOut)
  if (data.adults !== undefined) push('adults', parseCount(data.adults) ?? 1)
  if (data.children !== undefined) push('children', parseCount(data.children) ?? 0)
  if (data.source !== undefined) push('source', data.source || null)
  if (data.notes !== undefined) push('notes', data.notes || null)
  if (current.roomId !== nextRoomId) push('room_id', nextRoomId)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (nextRoomId) {
      await validateRoomAssignment(conn.query.bind(conn), nextRoomId, nextRoomTypeId, nextCheckIn, nextCheckOut, id)
      await conn.query("UPDATE rooms SET status = 'reserved' WHERE id = ?", [nextRoomId])
    }
    if (current.roomId && current.roomId !== nextRoomId) {
      await freeRoom(conn.query.bind(conn), current.roomId, id)
    }
    if (fields.length) {
      await conn.query(`UPDATE reservations SET ${fields.join(', ')} WHERE id = ?`, [...params, Number(id)])
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return findById(id)
}

async function remove(id) {
  const current = await findById(id)
  if (!current) throw httpError('Reservation not found', 404)
  if (current.status === 'checked_in') {
    throw httpError('In-house guests must check out before a reservation can be removed', 400)
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (current.roomId) await freeRoom(conn.query.bind(conn), current.roomId, id)
    await conn.query('UPDATE reservations SET status = ? WHERE id = ?', ['cancelled', Number(id)])
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
  return findById(id)
}

async function availableRooms({ checkInDate, checkOutDate, roomTypeId } = {}) {
  const conditions = ["r.is_active = 1 AND r.status IN ('available', 'reserved')"]
  const params = []
  if (roomTypeId) {
    conditions.push('r.room_type_id = ?')
    params.push(Number(roomTypeId))
  }
  if (checkInDate && checkOutDate) {
    conditions.push('NOT EXISTS (SELECT 1 FROM reservations rv WHERE rv.room_id = r.id AND rv.status IN (\'booked\', \'checked_in\') AND rv.check_in_date < ? AND rv.check_out_date > ?)')
    params.push(checkOutDate, checkInDate)
  }
  const [rows] = await pool.query(
    `SELECT r.id, r.room_number, r.floor, r.status, r.housekeeping_status, r.room_type_id,
            rt.name AS room_type_name, rt.base_rate
     FROM rooms r
     JOIN room_types rt ON rt.id = r.room_type_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY CAST(r.room_number AS UNSIGNED), r.room_number`,
    params,
  )
  return rows.map((row) => ({
    id: row.id,
    roomNumber: row.room_number,
    floor: row.floor,
    status: row.status,
    housekeepingStatus: row.housekeeping_status,
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name,
    baseRate: row.base_rate,
  }))
}

// Per-day availability for the front desk home screen: for every active room
// type, the count of active rooms with no overlapping booked/checked_in
// reservation and no room_block on each date (the same overlap condition
// availableRooms uses, aggregated per day per room type instead of a flat room
// list).
async function availabilityGrid({ startDate, days = 14 } = {}) {
  const start = startDate || todayStr()
  const count = Math.max(1, Math.min(Number(days) || 14, 60))
  const dates = dateSeries(start, count)
  const [types] = await pool.query(
    `SELECT rt.id, rt.name, rt.base_rate,
            (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id AND r.is_active = 1) AS total_rooms
     FROM room_types rt
     WHERE rt.is_active = 1
     ORDER BY rt.name ASC`,
  )
  const grid = types.map((t) => ({
    id: t.id,
    name: t.name,
    baseRate: Number(t.base_rate),
    totalRooms: Number(t.total_rooms || 0),
    available: dates.map(() => 0),
  }))
  const index = {}
  grid.forEach((g, i) => { index[g.id] = i })
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const [rows] = await pool.query(
      `SELECT rt.id AS room_type_id,
              SUM(CASE WHEN NOT EXISTS (
                SELECT 1 FROM reservations rv
                WHERE rv.room_id = r.id AND rv.status IN ('booked', 'checked_in')
                  AND rv.check_in_date < ? AND rv.check_out_date > ?
              ) AND NOT EXISTS (
                SELECT 1 FROM room_blocks b
                WHERE b.room_id = r.id AND b.start_date <= ? AND b.end_date >= ?
              ) THEN 1 ELSE 0 END) AS available
       FROM room_types rt
       JOIN rooms r ON r.room_type_id = rt.id
       WHERE rt.is_active = 1 AND r.is_active = 1
       GROUP BY rt.id`,
      [addDays(date, 1), date, date, date],
    )
    for (const row of rows) {
      const gi = index[row.room_type_id]
      if (gi !== undefined) grid[gi].available[i] = Number(row.available || 0)
    }
  }
  return { startDate: start, days: count, dates, roomTypes: grid }
}

// Stay View data for the front desk home screen:
//  - rooms: every room (active and inactive) with floor/type/housekeeping
//  - stays: reservations overlapping [startDate, startDate + days)
//  - blocks: room_blocks rows overlapping the same window
//  - roomTypes: active room types with per-date available counts (minus
//    overlaps and blocks) and per-date average rate from rate_plan_prices
//  - occupancy: per-date percent of active rooms with a checked_in guest
//  - statusCounts: occupancy-style partition of active rooms on the anchor
//    date (vacant/occupied/reserved/blocked) plus dueOut and dirty counts
async function stays({ startDate, days = 14 } = {}) {
  const start = startDate || todayStr()
  const count = Math.max(1, Math.min(Number(days) || 14, 60))
  const end = addDays(start, count)
  const dates = dateSeries(start, count)

  const [roomRows] = await pool.query(
    `SELECT r.id, r.room_number, r.floor, r.room_type_id, r.status, r.housekeeping_status, r.is_active,
            rt.name AS room_type_name
     FROM rooms r
     LEFT JOIN room_types rt ON rt.id = r.room_type_id
     ORDER BY (r.floor IS NULL) ASC, r.floor ASC, CAST(r.room_number AS UNSIGNED), r.room_number ASC`,
  )
  const [resRows] = await pool.query(
    `SELECT rv.id, rv.customer_id, rv.room_id, rv.room_type_id, rv.rate_plan_id,
            DATE_FORMAT(rv.check_in_date, '%Y-%m-%d') AS check_in_date,
            DATE_FORMAT(rv.check_out_date, '%Y-%m-%d') AS check_out_date,
            rv.status, rv.source,
            CONCAT_WS(' ', c.first_name, c.last_name) AS guest_name,
            rt.name AS room_type_name,
            r.room_number
     FROM reservations rv
     JOIN customers c ON c.id = rv.customer_id
     LEFT JOIN room_types rt ON rt.id = rv.room_type_id
     LEFT JOIN rooms r ON r.id = rv.room_id
     WHERE rv.status IN ('booked', 'checked_in', 'checked_out')
       AND rv.check_in_date < ? AND rv.check_out_date > ?`,
    [end, start],
  )
  const [blockRows] = await pool.query(
    `SELECT b.id, b.room_id, r.room_type_id,
            DATE_FORMAT(b.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(b.end_date, '%Y-%m-%d') AS end_date,
            b.reason, r.room_number, rt.name AS room_type_name
     FROM room_blocks b
     JOIN rooms r ON r.id = b.room_id
     LEFT JOIN room_types rt ON rt.id = r.room_type_id
     WHERE b.start_date < ? AND b.end_date >= ?`,
    [end, start],
  )

  const [typeRows] = await pool.query(
    `SELECT rt.id, rt.name, rt.base_rate,
            (SELECT COUNT(*) FROM rooms r WHERE r.room_type_id = rt.id AND r.is_active = 1) AS total_rooms
     FROM room_types rt
     WHERE rt.is_active = 1
     ORDER BY rt.name ASC`,
  )
  const typeIndex = {}
  const roomTypes = typeRows.map((t) => {
    const group = {
      id: t.id,
      name: t.name,
      baseRate: Number(t.base_rate),
      totalRooms: Number(t.total_rooms || 0),
      available: dates.map(() => 0),
      avgRate: dates.map(() => null),
    }
    typeIndex[group.id] = group
    return group
  })
  if (typeRows.length) {
    const ids = typeRows.map((t) => t.id)
    const [prices] = await pool.query(
      `SELECT room_type_id, AVG(rate) AS avg_rate
       FROM rate_plan_prices
       WHERE room_type_id IN (${ids.map(() => '?').join(',')})
       GROUP BY room_type_id`,
      ids,
    )
    for (const p of prices) {
      const group = typeIndex[p.room_type_id]
      if (group) group.avgRate = dates.map(() => Number(p.avg_rate))
    }
  }

  const [[totalRow]] = await pool.query('SELECT COUNT(*) AS c FROM rooms WHERE is_active = 1')
  const totalRooms = Number(totalRow.c || 0)
  const occupancy = dates.map(() => 0)

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const [avRows] = await pool.query(
      `SELECT rt.id AS room_type_id,
              SUM(CASE WHEN NOT EXISTS (
                SELECT 1 FROM reservations rv
                WHERE rv.room_id = r.id AND rv.status IN ('booked', 'checked_in')
                  AND rv.check_in_date < ? AND rv.check_out_date > ?
              ) AND NOT EXISTS (
                SELECT 1 FROM room_blocks b
                WHERE b.room_id = r.id AND b.start_date <= ? AND b.end_date >= ?
              ) THEN 1 ELSE 0 END) AS available
       FROM room_types rt
       JOIN rooms r ON r.room_type_id = rt.id
       WHERE rt.is_active = 1 AND r.is_active = 1
       GROUP BY rt.id`,
      [addDays(date, 1), date, date, date],
    )
    for (const row of avRows) {
      const group = typeIndex[row.room_type_id]
      if (group) group.available[i] = Number(row.available || 0)
    }
    const [[occRow]] = await pool.query(
      `SELECT COUNT(DISTINCT rv.room_id) AS c
       FROM reservations rv
       WHERE rv.status = 'checked_in' AND rv.room_id IS NOT NULL
         AND rv.check_in_date < ? AND rv.check_out_date > ?`,
      [addDays(date, 1), date],
    )
    occupancy[i] = totalRooms ? Math.round((Number(occRow.c || 0) / totalRooms) * 1000) / 10 : 0
  }

  const idSet = (rows, key) => new Set(rows.filter((r) => r[key]).map((r) => Number(r[key])))
  const [occupiedRows] = await pool.query(
    `SELECT DISTINCT rv.room_id FROM reservations rv
     WHERE rv.status = 'checked_in' AND rv.room_id IS NOT NULL
       AND rv.check_in_date < ? AND rv.check_out_date > ?`,
    [addDays(start, 1), start],
  )
  const [reservedRows] = await pool.query(
    `SELECT DISTINCT rv.room_id FROM reservations rv
     WHERE rv.status = 'booked' AND rv.room_id IS NOT NULL
       AND rv.check_in_date < ? AND rv.check_out_date > ?`,
    [addDays(start, 1), start],
  )
  const [blockedRows] = await pool.query(
    `SELECT DISTINCT b.room_id FROM room_blocks b
     JOIN rooms r ON r.id = b.room_id
     WHERE r.is_active = 1 AND b.start_date <= ? AND b.end_date >= ?`,
    [start, start],
  )
  const occupiedSet = idSet(occupiedRows, 'room_id')
  const reservedSet = idSet(reservedRows, 'room_id')
  const blockedSet = idSet(blockedRows, 'room_id')
  for (const id of occupiedSet) {
    reservedSet.delete(id)
    blockedSet.delete(id)
  }
  for (const id of reservedSet) blockedSet.delete(id)

  const [[dueOutRow]] = await pool.query(
    `SELECT COUNT(*) AS c FROM reservations rv WHERE rv.status = 'checked_in' AND rv.check_out_date = ?`,
    [start],
  )
  const [[dirtyRow]] = await pool.query(
    `SELECT COUNT(*) AS c FROM rooms WHERE is_active = 1 AND housekeeping_status = 'dirty'`,
  )

  const occupied = occupiedSet.size
  const reserved = reservedSet.size
  const blocked = blockedSet.size

  return {
    startDate: start,
    endDate: end,
    days: count,
    totalRooms,
    rooms: roomRows.map((row) => ({
      id: row.id,
      roomNumber: row.room_number,
      floor: row.floor,
      roomTypeId: row.room_type_id,
      roomTypeName: row.room_type_name || null,
      status: row.status,
      housekeepingStatus: row.housekeeping_status,
      isActive: Boolean(row.is_active),
    })),
    roomTypes,
    stays: resRows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      roomId: row.room_id,
      roomTypeId: row.room_type_id,
      ratePlanId: row.rate_plan_id,
      roomTypeName: row.room_type_name || null,
      roomNumber: row.room_number || null,
      guestName: row.guest_name,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      status: row.status,
      source: row.source || null,
    })),
    blocks: blockRows.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      roomTypeId: row.room_type_id,
      roomTypeName: row.room_type_name || null,
      roomNumber: row.room_number || null,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason || 'Blocked',
    })),
    statusCounts: {
      all: totalRooms,
      vacant: Math.max(0, totalRooms - occupied - reserved - blocked),
      occupied,
      reserved,
      blocked,
      dueOut: Number(dueOutRow.c || 0),
      dirty: Number(dirtyRow.c || 0),
    },
    occupancy,
  }
}

async function checkIn(id, roomId, opts = {}) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query(
      `${BASE_SELECT} WHERE rv.id = ? FOR UPDATE`,
      [Number(id)],
    )
    const reservation = rows[0]
    if (!reservation) throw httpError('Reservation not found', 404)
    if (reservation.status !== 'booked') {
      throw httpError('Only booked reservations can be checked in', 400)
    }
    if (!roomId) throw httpError('A room is required for check-in', 400)
    const [rooms] = await conn.query(
      `SELECT * FROM rooms WHERE id = ? FOR UPDATE`,
      [Number(roomId)],
    )
    const room = rooms[0]
    if (!room || !room.is_active) throw httpError('Room not found or inactive', 400)
    if (room.room_type_id !== reservation.room_type_id) {
      throw httpError('Room does not match the reserved room type', 400)
    }
    if (room.status === 'occupied') throw httpError('Room is already occupied', 400)
    const [overlaps] = await conn.query(
      `SELECT rv.id FROM reservations rv
       WHERE rv.room_id = ? AND rv.status IN ('booked', 'checked_in')
         AND rv.id <> ? AND rv.check_in_date < ? AND rv.check_out_date > ?`,
      [Number(roomId), Number(id), reservation.check_out_date, reservation.check_in_date],
    )
    if (overlaps.length) throw httpError('Room has an overlapping reservation', 400)

    await conn.query('UPDATE rooms SET status = ? WHERE id = ?', ['occupied', Number(roomId)])
    await conn.query('UPDATE reservations SET room_id = ?, status = ? WHERE id = ?', [
      Number(roomId), 'checked_in', Number(id),
    ])

    const [openFolioRows] = await conn.query(
      `SELECT id FROM folios WHERE reservation_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
      [Number(id)],
    )
    let folioId = openFolioRows[0]?.id || null
    if (!folioId) {
      const [folioResult] = await conn.query(
        'INSERT INTO folios (reservation_id, customer_id, room_id, status) VALUES (?, ?, ?, ?)',
        [Number(id), reservation.customer_id, Number(roomId), 'open'],
      )
      folioId = folioResult.insertId
    }
    await conn.commit()
    return { reservationId: Number(id), roomId: Number(roomId), folioId }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function checkOut(id, opts = {}) {
  const { forceReason } = opts
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query(`${BASE_SELECT} WHERE rv.id = ? FOR UPDATE`, [Number(id)])
    const reservation = rows[0]
    if (!reservation) throw httpError('Reservation not found', 404)
    if (reservation.status !== 'checked_in') {
      throw httpError('Only in-house reservations can be checked out', 400)
    }
    if (!reservation.room_id) throw httpError('Reservation has no assigned room', 400)

    const [folioRows] = await conn.query(
      `SELECT id, balance FROM folios WHERE reservation_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [Number(id)],
    )
    const folio = folioRows[0]
    if (folio && Number(folio.balance) !== 0) {
      if (!forceReason) {
        throw httpError(`Folio has an outstanding balance of ${Number(folio.balance).toFixed(2)}`, 400)
      }
      await conn.query(
        'INSERT INTO folio_line_items (folio_id, type, description, amount) VALUES (?, ?, ?, ?)',
        [folio.id, 'adjustment', `Force close: ${forceReason}`, -Number(folio.balance)],
      )
      await conn.query(
        'UPDATE folios SET balance = (SELECT COALESCE(SUM(amount), 0) FROM folio_line_items WHERE folio_id = ?) WHERE id = ?',
        [folio.id, folio.id],
      )
    }
    if (folio) {
      await conn.query('UPDATE folios SET status = ?, closed_at = NOW() WHERE id = ?', ['closed', folio.id])
    }

    await conn.query('UPDATE reservations SET status = ? WHERE id = ?', ['checked_out', Number(id)])
    await conn.query(
      'UPDATE rooms SET status = ?, housekeeping_status = ? WHERE id = ?',
      ['available', 'dirty', Number(reservation.room_id)],
    )
    await conn.commit()
    return { reservationId: Number(id), roomId: reservation.room_id }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function dashboardCounts() {
  const [arrivals] = await pool.query(
    `SELECT COUNT(*) AS n FROM reservations
     WHERE status IN ('booked', 'checked_in') AND check_in_date = CURDATE()`,
  )
  const [departures] = await pool.query(
    `SELECT COUNT(*) AS n FROM reservations
     WHERE status IN ('checked_in') AND check_out_date = CURDATE()`,
  )
  const [inHouse] = await pool.query(
    `SELECT COUNT(*) AS n FROM reservations WHERE status = 'checked_in'`,
  )
  const [rooms] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'occupied') AS occupied,
            SUM(status = 'available' AND housekeeping_status = 'dirty') AS dirty,
            SUM(status = 'available' AND housekeeping_status = 'clean') AS clean
     FROM rooms WHERE is_active = 1`,
  )
  const [folioBalance] = await pool.query(
    `SELECT COALESCE(SUM(balance), 0) AS balance FROM folios WHERE status = 'open'`,
  )
  const [expected] = await pool.query(
    `SELECT COALESCE(SUM(rp.nights), 0) AS total FROM (
       SELECT DATEDIFF(check_out_date, check_in_date) AS nights FROM reservations
       WHERE status = 'checked_in' AND check_out_date > check_in_date
     ) rp`,
  )
  return {
    arrivalsToday: Number(arrivals[0]?.n || 0),
    departuresToday: Number(departures[0]?.n || 0),
    inHouse: Number(inHouse[0]?.n || 0),
    rooms: {
      total: Number(rooms[0]?.total || 0),
      occupied: Number(rooms[0]?.occupied || 0),
      dirty: Number(rooms[0]?.dirty || 0),
      clean: Number(rooms[0]?.clean || 0),
    },
    openFolioBalance: Number(folioBalance[0]?.balance || 0),
    expectedArrivalNights: Number(expected[0]?.total || 0),
  }
}

module.exports = { findAll, findById, create, update, remove, checkIn, checkOut, availableRooms, availabilityGrid, stays, dashboardCounts }
