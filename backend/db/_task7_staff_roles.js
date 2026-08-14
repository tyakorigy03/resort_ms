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

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  if (!(await tableExists(conn, 'staff_roles'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS staff_roles (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_staff_role_name (name)
      )`)
    console.log('staff_roles created')
  }

  if (!(await tableExists(conn, 'role_permissions'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        role_id INT UNSIGNED NOT NULL,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_role_perm (role_id, permission),
        CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE CASCADE
      )`)
    console.log('role_permissions created')
  }

  if (!(await hasColumn(conn, 'staff', 'role_id'))) {
    await conn.query('ALTER TABLE staff ADD COLUMN role_id INT UNSIGNED NULL AFTER position')
    await conn.query(
      'ALTER TABLE staff ADD CONSTRAINT fk_staff_role FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE SET NULL',
    )
    await conn.query('ALTER TABLE staff ADD KEY idx_staff_role (role_id)')
    console.log('staff.role_id added')
  }

  const [cashierRows] = await conn.query('SELECT id FROM staff_roles WHERE name = ?', ['Cashier'])
  let cashierId = cashierRows[0]?.id
  if (!cashierId) {
    const [r] = await conn.query(
      'INSERT INTO staff_roles (name, description) VALUES (?, ?)',
      ['Cashier', 'Standard point-of-sale operator'],
    )
    cashierId = r.insertId
    console.log('role seeded: Cashier')
  }

  const [managerRows] = await conn.query('SELECT id FROM staff_roles WHERE name = ?', ['Manager'])
  let managerId = managerRows[0]?.id
  if (!managerId) {
    const [r] = await conn.query(
      'INSERT INTO staff_roles (name, description) VALUES (?, ?)',
      ['Manager', 'Can open and close sales periods'],
    )
    managerId = r.insertId
    console.log('role seeded: Manager')
  }

  for (const perm of ['sale_period.open', 'sale_period.close']) {
    await conn.query('INSERT IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)', [managerId, perm])
  }
  console.log('manager permissions seeded')

  await conn.end()
  console.log('Staff roles migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
