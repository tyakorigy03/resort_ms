require('dotenv').config()
const mysql = require('mysql2/promise')

async function hasColumn(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
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

  if (!(await hasColumn(conn, 'staff', 'user_id'))) {
    await conn.query('ALTER TABLE staff ADD COLUMN user_id INT UNSIGNED NULL AFTER email')
    await conn.query('ALTER TABLE staff ADD UNIQUE KEY uk_staff_user (user_id)')
    await conn.query(
      'ALTER TABLE staff ADD CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    )
    console.log('staff.user_id added')
  } else {
    console.log('staff.user_id already exists')
  }

  if ((await hasColumn(conn, 'staff', 'role')) && !(await hasColumn(conn, 'staff', 'position'))) {
    await conn.query('ALTER TABLE staff CHANGE COLUMN role position VARCHAR(100) NULL')
    console.log('staff.role renamed to position')
  } else {
    console.log('staff.role -> position already handled')
  }

  await conn.end()
  console.log('Staff-user link migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
