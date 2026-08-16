require('dotenv').config()
const mysql = require('mysql2/promise')

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
    [table],
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

  if (!(await tableExists(conn, 'room_blocks'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS room_blocks (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        room_id INT UNSIGNED NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_block_room (room_id),
        KEY idx_block_dates (start_date, end_date),
        CONSTRAINT fk_block_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      )`)
    console.log('room_blocks created')
  }

  await conn.end()
  console.log('room_blocks migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
