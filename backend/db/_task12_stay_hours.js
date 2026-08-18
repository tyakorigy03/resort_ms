require('dotenv').config()
const mysql = require('mysql2/promise')

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  const [cols] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reservations' AND column_name = 'stay_hours' LIMIT 1"
  )
  if (!cols.length) {
    await conn.query(
      "ALTER TABLE reservations ADD COLUMN stay_hours INT UNSIGNED NULL COMMENT 'Exact stay duration in hours (e.g. 36 = 1.5 days)' AFTER check_out_date"
    )
    console.log('stay_hours column added')
  } else {
    console.log('stay_hours column already exists')
  }

  await conn.end()
  console.log('stay_hours migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
