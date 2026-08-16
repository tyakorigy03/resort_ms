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

  // pos_orders may not exist yet on a fresh chain; folio_line_items FK's to it,
  // so lay down the base table defensively the same way _task9 does.
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
        CONSTRAINT fk_pos_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
      )`)
    console.log('pos_orders created (task10 base)')
  }

  if (!(await tableExists(conn, 'reservations'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        customer_id INT UNSIGNED NOT NULL,
        room_id INT UNSIGNED NULL,
        room_type_id INT UNSIGNED NOT NULL,
        rate_plan_id INT UNSIGNED NULL,
        check_in_date DATE NOT NULL,
        check_out_date DATE NOT NULL,
        adults INT UNSIGNED NOT NULL DEFAULT 1,
        children INT UNSIGNED NOT NULL DEFAULT 0,
        status ENUM('booked','checked_in','checked_out','no_show','cancelled') NOT NULL DEFAULT 'booked',
        source VARCHAR(20) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_res_customer (customer_id),
        KEY idx_res_room (room_id),
        KEY idx_res_room_type (room_type_id),
        KEY idx_res_dates (check_in_date, check_out_date),
        KEY idx_res_status (status),
        CONSTRAINT fk_res_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_res_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
        CONSTRAINT fk_res_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT,
        CONSTRAINT fk_res_rate_plan FOREIGN KEY (rate_plan_id) REFERENCES rate_plans(id) ON DELETE SET NULL
      )`)
    console.log('reservations created')
  }

  if (!(await tableExists(conn, 'folios'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS folios (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        reservation_id INT UNSIGNED NULL,
        customer_id INT UNSIGNED NOT NULL,
        room_id INT UNSIGNED NULL,
        status ENUM('open','closed') NOT NULL DEFAULT 'open',
        opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME NULL,
        balance DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_folio_reservation (reservation_id),
        KEY idx_folio_customer (customer_id),
        KEY idx_folio_room (room_id),
        CONSTRAINT fk_folio_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
        CONSTRAINT fk_folio_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_folio_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
      )`)
    console.log('folios created')
  }

  if (!(await tableExists(conn, 'folio_line_items'))) {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS folio_line_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        folio_id INT UNSIGNED NOT NULL,
        type ENUM('room_charge','pos_charge','payment','adjustment','tax') NOT NULL DEFAULT 'room_charge',
        description VARCHAR(255) NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        source_order_id INT UNSIGNED NULL,
        staff_id INT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_fli_folio (folio_id),
        KEY idx_fli_order (source_order_id),
        CONSTRAINT fk_fli_folio FOREIGN KEY (folio_id) REFERENCES folios(id) ON DELETE CASCADE,
        CONSTRAINT fk_fli_order FOREIGN KEY (source_order_id) REFERENCES pos_orders(id) ON DELETE SET NULL,
        CONSTRAINT fk_fli_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
      )`)
    console.log('folio_line_items created')
  }

  await conn.end()
  console.log('Front desk migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
