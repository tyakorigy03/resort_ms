require('dotenv').config()
const mysql = require('mysql2/promise')

async function columnExists(conn, table, column) {
  const [rows] = await conn.query('SHOW COLUMNS FROM `' + table + "` LIKE '" + column + "'")
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

  if (!(await columnExists(conn, 'devices', 'pin'))) {
    await conn.query('ALTER TABLE devices ADD COLUMN pin VARCHAR(255) NULL AFTER code')
  }

  if (!(await columnExists(conn, 'staff', 'pin'))) {
    await conn.query('ALTER TABLE staff ADD COLUMN pin VARCHAR(255) NULL AFTER hire_date')
  }
  if (!(await columnExists(conn, 'staff', 'qr_code'))) {
    await conn.query('ALTER TABLE staff ADD COLUMN qr_code VARCHAR(64) NULL AFTER pin, ADD UNIQUE KEY uk_staff_qr (qr_code)')
  }

  await conn.query(`CREATE TABLE IF NOT EXISTS staff_clock_events (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    staff_id INT UNSIGNED NOT NULL,
    device_id INT UNSIGNED NULL,
    clocked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clocked_out_at DATETIME NULL,
    method ENUM('pin','qr') NULL,
    notes TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_clock_staff (staff_id),
    KEY idx_clock_device (device_id),
    CONSTRAINT fk_clock_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT fk_clock_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
  )`)

  await conn.query(`CREATE TABLE IF NOT EXISTS sale_periods (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    outlet_id INT UNSIGNED NOT NULL,
    opened_by_staff_id INT UNSIGNED NULL,
    opened_on_device_id INT UNSIGNED NULL,
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_by_staff_id INT UNSIGNED NULL,
    closed_on_device_id INT UNSIGNED NULL,
    closed_at DATETIME NULL,
    opening_notes TEXT NULL,
    closing_notes TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_sp_outlet (outlet_id),
    KEY idx_sp_opened_by (opened_by_staff_id),
    KEY idx_sp_device (opened_on_device_id),
    CONSTRAINT fk_sp_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    CONSTRAINT fk_sp_opened_by FOREIGN KEY (opened_by_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_sp_device FOREIGN KEY (opened_on_device_id) REFERENCES devices(id) ON DELETE SET NULL
  )`)

  await conn.end()
  console.log('Migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
