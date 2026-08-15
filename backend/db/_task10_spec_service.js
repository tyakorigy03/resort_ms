require('dotenv').config()
const mysql = require('mysql2/promise')

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
    [table],
  )
  return rows.length > 0
}

async function hasColumn(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column],
  )
  return rows.length > 0
}

async function addColumn(conn, table, column, definition) {
  if (!(await hasColumn(conn, table, column))) {
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`${table}.${column} added`)
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  // Spec 5.1: floor plans carry an optional order profile, a "prompt a cover
  // count entry" toggle and an optional background image for the canvas.
  await addColumn(conn, 'floor_plans', 'order_profile_id', 'INT UNSIGNED NULL')
  await addColumn(conn, 'floor_plans', 'prompt_cover_count', "TINYINT(1) NOT NULL DEFAULT 1")
  await addColumn(conn, 'floor_plans', 'background_image_url', 'VARCHAR(255) NULL')

  // Spec 3.2: cash-drawer gate. One open count per drawer device per day; a
  // record for today suppresses the gate. No FK to order profiles yet (none
  // exist as a table), so order_profile_id is left as a bare column.
  if (!(await tableExists(conn, 'cash_drawer_counts'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cash_drawer_counts (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        drawer_device_id INT UNSIGNED NOT NULL,
        outlet_id INT UNSIGNED NOT NULL,
        staff_id INT UNSIGNED NULL,
        count_date DATE NOT NULL,
        opening_count DECIMAL(12,2) NOT NULL DEFAULT 0,
        confirmed_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_cdc_drawer_day (drawer_device_id, count_date),
        KEY idx_cdc_outlet (outlet_id),
        CONSTRAINT fk_cdc_drawer FOREIGN KEY (drawer_device_id) REFERENCES devices(id) ON DELETE CASCADE,
        CONSTRAINT fk_cdc_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
        CONSTRAINT fk_cdc_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
      )`)
    console.log('cash_drawer_counts created')
  }

  await conn.end()
  console.log('Spec service migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
