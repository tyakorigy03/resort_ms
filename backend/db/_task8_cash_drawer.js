require('dotenv').config()
const mysql = require('mysql2/promise')

// Cash drawer (till) tracking on staff shifts:
//   staff_clock_events.opening_cash  - float counted at clock-in (0 = none)
//   staff_clock_events.closing_cash  - count at clock-out (NULL = not counted)
async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  const [[tbl]] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'staff_clock_events'`,
  )
  if (tbl.n === 0) {
    throw new Error('staff_clock_events does not exist - run earlier migrations first')
  }

  const [cols] = await conn.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'staff_clock_events'
       AND column_name IN ('opening_cash','closing_cash')`,
  )
  const existing = new Set(cols.map((c) => c.column_name))

  if (!existing.has('opening_cash')) {
    await conn.query('ALTER TABLE staff_clock_events ADD COLUMN opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER method')
    console.log('added staff_clock_events.opening_cash')
  }
  if (!existing.has('closing_cash')) {
    await conn.query('ALTER TABLE staff_clock_events ADD COLUMN closing_cash DECIMAL(12,2) NULL AFTER opening_cash')
    console.log('added staff_clock_events.closing_cash')
  }

  await conn.end()
  console.log('Cash drawer migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
