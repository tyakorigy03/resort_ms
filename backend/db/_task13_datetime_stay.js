require('dotenv').config()
const mysql = require('mysql2/promise')

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  })

  const [cols] = await conn.query(
    "SELECT data_type FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reservations' AND column_name = 'check_in_date' LIMIT 1"
  )
  const currentType = cols[0]?.data_type

  if (currentType === 'date') {
    await conn.query(`
      ALTER TABLE reservations
        MODIFY COLUMN check_in_date DATETIME NOT NULL,
        MODIFY COLUMN check_out_date DATETIME NOT NULL
    `)
    console.log('check_in_date / check_out_date changed to DATETIME')
  } else {
    console.log('Columns already DATETIME, skipping')
  }

  const [stayCol] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reservations' AND column_name = 'stay_hours' LIMIT 1"
  )
  if (stayCol.length) {
    await conn.query('ALTER TABLE reservations DROP COLUMN stay_hours')
    console.log('stay_hours column dropped')
  }

  await conn.end()
  console.log('datetime migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
