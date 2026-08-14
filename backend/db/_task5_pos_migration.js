require('dotenv').config()
const mysql = require('mysql2/promise')

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  await conn.query(`CREATE TABLE IF NOT EXISTS pos_orders (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_number VARCHAR(24) NOT NULL,
    outlet_id INT UNSIGNED NOT NULL,
    device_id INT UNSIGNED NULL,
    staff_id INT UNSIGNED NULL,
    sale_period_id INT UNSIGNED NULL,
    status ENUM('open','paid','void') NOT NULL DEFAULT 'open',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) NOT NULL DEFAULT 0,
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

  await conn.query(`CREATE TABLE IF NOT EXISTS pos_order_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    item_id INT UNSIGNED NULL,
    item_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    line_total DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_poi_order (order_id),
    KEY idx_poi_item (item_id),
    CONSTRAINT fk_poi_order FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
  )`)

  await conn.end()
  console.log('POS migration complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
