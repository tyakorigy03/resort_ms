require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { pool } = require('../src/config/db')

async function migrate() {
  const conn = await pool.getConnection()
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS guest_otps (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        reservation_id INT UNSIGNED NOT NULL,
        email VARCHAR(150) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        verified TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_otp_reservation (reservation_id),
        KEY idx_otp_email (email)
      )
    `)
    console.log('guest_otps table created')
  } finally {
    conn.release()
  }
  await pool.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
