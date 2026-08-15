const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapCount(row) {
  if (!row) return null
  return {
    id: row.id,
    drawerDeviceId: row.drawer_device_id,
    outletId: row.outlet_id,
    staffId: row.staff_id,
    staffName: row.staff_name || null,
    countDate: row.count_date,
    openingCount: Number(row.opening_count),
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const COUNT_COLUMNS = `
  c.id, c.drawer_device_id, c.outlet_id, c.staff_id, c.count_date,
  c.opening_count, c.confirmed_at, c.created_at, c.updated_at,
  CONCAT_WS(' ', s.first_name, s.last_name) AS staff_name
`

// The spec gate (3.2): the register only needs a count confirmation when there
// is no count for this drawer today yet.
async function findToday(drawerDeviceId) {
  const [rows] = await pool.query(
    `SELECT ${COUNT_COLUMNS}
     FROM cash_drawer_counts c
     LEFT JOIN staff s ON s.id = c.staff_id
     WHERE c.drawer_device_id = ? AND c.count_date = CURDATE()
     LIMIT 1`,
    [drawerDeviceId],
  )
  return mapCount(rows[0])
}

async function confirm({ drawerDeviceId, outletId, staffId, openingCount }) {
  const amount = Math.round((Number(openingCount) || 0) * 100) / 100
  const date = new Date().toISOString().slice(0, 10)
  await pool.query(
    `INSERT INTO cash_drawer_counts (drawer_device_id, outlet_id, staff_id, count_date, opening_count, confirmed_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE staff_id = VALUES(staff_id), opening_count = VALUES(opening_count),
       confirmed_at = COALESCE(cash_drawer_counts.confirmed_at, NOW())`,
    [drawerDeviceId, outletId, staffId || null, date, amount],
  )

  // Mirror the confirmed opening cash onto the staff member's active clock
  // event so the till reconciliation at clock-out sees the same float.
  if (staffId) {
    await pool.query(
      `UPDATE staff_clock_events
       SET opening_cash = ?
       WHERE staff_id = ? AND clocked_out_at IS NULL AND opening_cash = 0`,
      [amount, staffId],
    )
  }

  return findToday(drawerDeviceId)
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${COUNT_COLUMNS}
     FROM cash_drawer_counts c
     LEFT JOIN staff s ON s.id = c.staff_id
     WHERE c.id = ?`,
    [id],
  )
  return mapCount(rows[0])
}

module.exports = { findToday, confirm, findById }
