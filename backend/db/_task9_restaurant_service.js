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

async function addForeignKey(conn, table, constraint, column, references) {
  await conn.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} FOREIGN KEY (${column}) ${references}`)
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  if (!(await tableExists(conn, 'floor_plans'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS floor_plans (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        outlet_id INT UNSIGNED NOT NULL,
        name VARCHAR(100) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_fp_outlet (outlet_id),
        CONSTRAINT fk_fp_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
      )`)
    console.log('floor_plans created')
  }

  if (!(await tableExists(conn, 'restaurant_tables'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        floor_plan_id INT UNSIGNED NOT NULL,
        label VARCHAR(20) NOT NULL,
        seats INT UNSIGNED NOT NULL DEFAULT 4,
        pos_x INT NULL,
        pos_y INT NULL,
        shape VARCHAR(20) NOT NULL DEFAULT 'square',
        status ENUM('available','seated','reserved') NOT NULL DEFAULT 'available',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_rt_floor_plan (floor_plan_id),
        CONSTRAINT fk_rt_floor_plan FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE CASCADE
      )`)
    console.log('restaurant_tables created')
  }

  if (!(await tableExists(conn, 'table_sessions'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS table_sessions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        table_id INT UNSIGNED NOT NULL,
        outlet_id INT UNSIGNED NOT NULL,
        opened_by_staff_id INT UNSIGNED NULL,
        opened_on_device_id INT UNSIGNED NULL,
        covers INT UNSIGNED NULL,
        status ENUM('open','closed') NOT NULL DEFAULT 'open',
        opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_ts_table (table_id),
        KEY idx_ts_outlet (outlet_id),
        CONSTRAINT fk_ts_table FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE,
        CONSTRAINT fk_ts_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
        CONSTRAINT fk_ts_staff FOREIGN KEY (opened_by_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
        CONSTRAINT fk_ts_device FOREIGN KEY (opened_on_device_id) REFERENCES devices(id) ON DELETE SET NULL
      )`)
    console.log('table_sessions created')
  }

  // pos_orders: keep the base table from _task5 if it exists, otherwise create
  // it fully so this migration is safe on a fresh chain. Then add the columns
  // that make it a real restaurant order (session, type, covers, customer, tip).
  if (!(await tableExists(conn, 'pos_orders'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pos_orders (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_number VARCHAR(24) NOT NULL,
        outlet_id INT UNSIGNED NOT NULL,
        device_id INT UNSIGNED NULL,
        staff_id INT UNSIGNED NULL,
        sale_period_id INT UNSIGNED NULL,
        customer_id INT UNSIGNED NULL,
        table_session_id INT UNSIGNED NULL,
        status ENUM('open','paid','void') NOT NULL DEFAULT 'open',
        order_type ENUM('dine_in','pickup','delivery') NOT NULL DEFAULT 'dine_in',
        collection_code VARCHAR(50) NULL,
        covers INT UNSIGNED NULL,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount DECIMAL(12,2) NOT NULL DEFAULT 0,
        tax DECIMAL(12,2) NOT NULL DEFAULT 0,
        tip DECIMAL(12,2) NULL,
        total DECIMAL(12,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(20) NULL,
        payment_received DECIMAL(12,2) NULL,
        change_due DECIMAL(12,2) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_order_number (order_number),
        KEY idx_pos_outlet (outlet_id),
        KEY idx_pos_device (device_id),
        KEY idx_pos_staff (staff_id),
        KEY idx_pos_period (sale_period_id),
        CONSTRAINT fk_pos_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
        CONSTRAINT fk_pos_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
        CONSTRAINT fk_pos_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
        CONSTRAINT fk_pos_period FOREIGN KEY (sale_period_id) REFERENCES sale_periods(id) ON DELETE SET NULL
      )`)
    console.log('pos_orders created (task9 base)')
  } else {
    await addColumn(conn, 'pos_orders', 'table_session_id', 'INT UNSIGNED NULL')
    await addColumn(conn, 'pos_orders', 'customer_id', 'INT UNSIGNED NULL')
    await addColumn(conn, 'pos_orders', 'order_type', "ENUM('dine_in','pickup','delivery') NOT NULL DEFAULT 'dine_in'")
    await addColumn(conn, 'pos_orders', 'collection_code', 'VARCHAR(50) NULL')
    await addColumn(conn, 'pos_orders', 'covers', 'INT UNSIGNED NULL')
    await addColumn(conn, 'pos_orders', 'tip', 'DECIMAL(12,2) NULL')
  }

  // Add any missing columns regardless of which branch created the table above.
  await addColumn(conn, 'pos_orders', 'table_session_id', 'INT UNSIGNED NULL')
  await addColumn(conn, 'pos_orders', 'customer_id', 'INT UNSIGNED NULL')
  await addColumn(conn, 'pos_orders', 'order_type', "ENUM('dine_in','pickup','delivery') NOT NULL DEFAULT 'dine_in'")
  await addColumn(conn, 'pos_orders', 'collection_code', 'VARCHAR(50) NULL')
  await addColumn(conn, 'pos_orders', 'covers', 'INT UNSIGNED NULL')
  await addColumn(conn, 'pos_orders', 'tip', 'DECIMAL(12,2) NULL')
  await addColumn(
    conn,
    'pos_orders',
    'updated_at',
    'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  )

  if (!(await hasColumn(conn, 'pos_orders', 'fk_pos_session'))) {
    // information_schema doesn't list constraints in .columns; guard by table.
  }
  // Add FKs/indexes if not already present (checked by constraint existence).
  const [sessionFk] = await conn.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = 'pos_orders' AND constraint_name = 'fk_pos_session' LIMIT 1`,
  )
  if (sessionFk.length === 0) {
    await conn.query('ALTER TABLE pos_orders ADD KEY idx_pos_session (table_session_id)')
    await conn.query(
      'ALTER TABLE pos_orders ADD CONSTRAINT fk_pos_session FOREIGN KEY (table_session_id) REFERENCES table_sessions(id) ON DELETE SET NULL',
    )
    console.log('pos_orders.table_session_id FK added')
  }
  const [customerFk] = await conn.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = 'pos_orders' AND constraint_name = 'fk_pos_customer' LIMIT 1`,
  )
  if (customerFk.length === 0) {
    await conn.query('ALTER TABLE pos_orders ADD KEY idx_pos_customer (customer_id)')
    await conn.query(
      'ALTER TABLE pos_orders ADD CONSTRAINT fk_pos_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL',
    )
    console.log('pos_orders.customer_id FK added')
  }

  if (!(await tableExists(conn, 'order_courses'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_courses (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id INT UNSIGNED NOT NULL,
        course_number INT UNSIGNED NOT NULL,
        name VARCHAR(100) NULL,
        fired_at DATETIME NULL,
        status ENUM('new','preparing','ready','completed','on_hold','cancelled') NOT NULL DEFAULT 'new',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_course_order_num (order_id, course_number),
        CONSTRAINT fk_course_order FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE
      )`)
    console.log('order_courses created')
  }

  if (!(await tableExists(conn, 'pos_order_items'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pos_order_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        order_id INT UNSIGNED NOT NULL,
        item_id INT UNSIGNED NULL,
        item_name VARCHAR(255) NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        line_total DECIMAL(12,2) NOT NULL,
        course_id INT UNSIGNED NULL,
        seat_number INT UNSIGNED NULL,
        production_center_id INT UNSIGNED NULL,
        is_station_copy TINYINT(1) NOT NULL DEFAULT 0,
        kds_status ENUM('new','preparing','ready','completed','on_hold','cancelled') NOT NULL DEFAULT 'new',
        fired_at DATETIME NULL,
        preparing_at DATETIME NULL,
        ready_at DATETIME NULL,
        completed_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_poi_order (order_id),
        KEY idx_poi_item (item_id),
        KEY idx_poi_course (course_id),
        KEY idx_poi_station_status (production_center_id, kds_status),
        CONSTRAINT fk_poi_order FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_poi_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
        CONSTRAINT fk_poi_course FOREIGN KEY (course_id) REFERENCES order_courses(id) ON DELETE SET NULL,
        CONSTRAINT fk_poi_station FOREIGN KEY (production_center_id) REFERENCES production_centers(id) ON DELETE SET NULL
      )`)
    console.log('pos_order_items created (task9 base)')
  } else {
    await addColumn(conn, 'pos_order_items', 'course_id', 'INT UNSIGNED NULL')
    await addColumn(conn, 'pos_order_items', 'seat_number', 'INT UNSIGNED NULL')
    await addColumn(conn, 'pos_order_items', 'production_center_id', 'INT UNSIGNED NULL')
    await addColumn(conn, 'pos_order_items', 'is_station_copy', 'TINYINT(1) NOT NULL DEFAULT 0')
    await addColumn(
      conn,
      'pos_order_items',
      'kds_status',
      "ENUM('new','preparing','ready','completed','on_hold','cancelled') NOT NULL DEFAULT 'new'",
    )
    await addColumn(conn, 'pos_order_items', 'fired_at', 'DATETIME NULL')
    await addColumn(conn, 'pos_order_items', 'preparing_at', 'DATETIME NULL')
    await addColumn(conn, 'pos_order_items', 'ready_at', 'DATETIME NULL')
    await addColumn(conn, 'pos_order_items', 'completed_at', 'DATETIME NULL')
  }
  await addColumn(conn, 'pos_order_items', 'course_id', 'INT UNSIGNED NULL')
  await addColumn(conn, 'pos_order_items', 'seat_number', 'INT UNSIGNED NULL')
  await addColumn(conn, 'pos_order_items', 'production_center_id', 'INT UNSIGNED NULL')
  await addColumn(conn, 'pos_order_items', 'is_station_copy', 'TINYINT(1) NOT NULL DEFAULT 0')
  await addColumn(
    conn,
    'pos_order_items',
    'kds_status',
    "ENUM('new','preparing','ready','completed','on_hold','cancelled') NOT NULL DEFAULT 'new'",
  )
  await addColumn(conn, 'pos_order_items', 'fired_at', 'DATETIME NULL')
  await addColumn(conn, 'pos_order_items', 'preparing_at', 'DATETIME NULL')
  await addColumn(conn, 'pos_order_items', 'ready_at', 'DATETIME NULL')
  await addColumn(conn, 'pos_order_items', 'completed_at', 'DATETIME NULL')
  await addColumn(
    conn,
    'pos_order_items',
    'updated_at',
    'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  )

  const [poiCourseFk] = await conn.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = 'pos_order_items' AND constraint_name = 'fk_poi_course' LIMIT 1`,
  )
  if (poiCourseFk.length === 0) {
    await conn.query('ALTER TABLE pos_order_items ADD KEY idx_poi_course (course_id)')
    await conn.query(
      'ALTER TABLE pos_order_items ADD CONSTRAINT fk_poi_course FOREIGN KEY (course_id) REFERENCES order_courses(id) ON DELETE SET NULL',
    )
    console.log('pos_order_items.course_id FK added')
  }
  const [poiStationFk] = await conn.query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = 'pos_order_items' AND constraint_name = 'fk_poi_station' LIMIT 1`,
  )
  if (poiStationFk.length === 0) {
    await conn.query('ALTER TABLE pos_order_items ADD KEY idx_poi_station_status (production_center_id, kds_status)')
    await conn.query(
      'ALTER TABLE pos_order_items ADD CONSTRAINT fk_poi_station FOREIGN KEY (production_center_id) REFERENCES production_centers(id) ON DELETE SET NULL',
    )
    console.log('pos_order_items.production_center_id FK added')
  }

  if (!(await tableExists(conn, 'kds_station_settings'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS kds_station_settings (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        production_center_id INT UNSIGNED NOT NULL,
        ticket_view ENUM('full','condensed') NOT NULL DEFAULT 'full',
        color_theme VARCHAR(20) NOT NULL DEFAULT 'light',
        language VARCHAR(10) NOT NULL DEFAULT 'en',
        show_station_filter TINYINT(1) NOT NULL DEFAULT 1,
        show_status_filter TINYINT(1) NOT NULL DEFAULT 1,
        show_type_filter TINYINT(1) NOT NULL DEFAULT 1,
        deactivated_statuses JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_kds_settings_pc (production_center_id),
        CONSTRAINT fk_kds_settings_pc FOREIGN KEY (production_center_id) REFERENCES production_centers(id) ON DELETE CASCADE
      )`)
    console.log('kds_station_settings created')
  }

  await conn.end()
  console.log('Restaurant service migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
