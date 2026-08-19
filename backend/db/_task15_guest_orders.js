require('dotenv').config()
const mysql = require('mysql2/promise')

async function hasColumn(conn, table, column) {
  const [rows] = await conn.query(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1',
    [table, column],
  )
  return rows.length > 0
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  if (!(await hasColumn(conn, 'pos_orders', 'notes'))) {
    await conn.query('ALTER TABLE pos_orders ADD COLUMN notes TEXT NULL')
    console.log('pos_orders.notes added')
  }

  const [rows] = await conn.query("SHOW COLUMNS FROM pos_orders WHERE Field = 'order_type'")
  const typeDef = rows[0]?.Type || ''
  if (!typeDef.includes('room_charge')) {
    await conn.query(
      "ALTER TABLE pos_orders MODIFY COLUMN order_type ENUM('dine_in','pickup','delivery','room_charge') NOT NULL DEFAULT 'dine_in'",
    )
    console.log('pos_orders.order_type updated to include room_charge')
  }

  await conn.end()
  console.log('Guest order migration complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
