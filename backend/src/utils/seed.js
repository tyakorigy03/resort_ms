require('dotenv').config()
const bcrypt = require('bcryptjs')
const { pool } = require('../config/db')

const supplierSeed = [
  { name: 'Farm Fresh Ltd', contact: 'farmfresh@mail.com' },
  { name: 'Coastal Beverages', contact: 'coastal@mail.com' },
  { name: 'Global Grocers', contact: 'global@mail.com' },
  { name: 'ChemCo Supplies', contact: 'chemco@mail.com' },
]

const itemSeed = [
  {
    name: 'Flour',
    sku: 'RM-001',
    category: 'Dry Goods',
    measuredBy: 'Units',
    unit: 'Bag',
    accountingGroup: 'Food',
    description: 'Wheat flour for baking',
    suppliers: ['Farm Fresh Ltd', 'Global Grocers'],
  },
  {
    name: 'Sugar',
    sku: 'RM-002',
    category: 'Dry Goods',
    measuredBy: 'Units',
    unit: 'Bag',
    accountingGroup: 'Food',
    description: 'White granulated sugar',
    suppliers: ['Global Grocers'],
  },
  {
    name: 'Rice',
    sku: 'RM-003',
    category: 'Dry Goods',
    measuredBy: 'Weight',
    unit: 'Kilogram',
    accountingGroup: 'Food',
    description: 'Long grain rice',
    suppliers: ['Farm Fresh Ltd', 'Global Grocers'],
  },
  {
    name: 'Cooking Oil',
    sku: 'RM-004',
    category: 'Dry Goods',
    measuredBy: 'Volume',
    unit: 'Litre',
    accountingGroup: 'Food',
    description: 'Vegetable cooking oil',
    suppliers: ['Coastal Beverages'],
  },
  {
    name: 'Salt',
    sku: 'RM-005',
    category: 'Dry Goods',
    measuredBy: 'Units',
    unit: 'Bag',
    accountingGroup: 'Food',
    description: 'Iodised table salt',
    suppliers: ['Farm Fresh Ltd', 'ChemCo Supplies'],
  },
]

const priceSeed = {
  Flour: { cost: 12.5, sell: 19.99 },
  Sugar: { cost: 28, sell: 39.99 },
  Rice: { cost: 3.2, sell: 5.5 },
  'Cooking Oil': { cost: 8.75, sell: 12.99 },
  Salt: { cost: 1.9, sell: 3.25 },
}

const countSeed = [
  {
    daysAgo: 6,
    staff: 'James O.',
    notes: 'Weekly count - dry goods store',
    items: [
      { item: 'Flour', system: 120, counted: 118 },
      { item: 'Sugar', system: 45, counted: 45 },
      { item: 'Rice', system: 300, counted: 305 },
    ],
  },
  {
    daysAgo: 20,
    staff: 'Mary K.',
    notes: null,
    items: [
      { item: 'Cooking Oil', system: 60, counted: 58 },
      { item: 'Salt', system: 100, counted: 100 },
    ],
  },
]

const movementSeed = [
  { item: 'Flour', direction: 'IN', qty: 130, unitCost: 12.5 },
  { item: 'Flour', direction: 'OUT', qty: 10, unitCost: 12.5, reference: 'Usage' },
  { item: 'Sugar', direction: 'IN', qty: 50, unitCost: 28 },
  { item: 'Sugar', direction: 'OUT', qty: 5, unitCost: 28, reference: 'Usage' },
  { item: 'Rice', direction: 'IN', qty: 300, unitCost: 3.2 },
  { item: 'Cooking Oil', direction: 'IN', qty: 65, unitCost: 8.75 },
  { item: 'Cooking Oil', direction: 'OUT', qty: 5, unitCost: 8.75, reference: 'Usage' },
  { item: 'Salt', direction: 'IN', qty: 100, unitCost: 1.9 },
]

function dateDaysAgo(days) {
  return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
}

async function seed() {
  const email = process.env.SEED_EMAIL || 'admin@resort.com'
  const password = process.env.SEED_PASSWORD || 'admin123'
  const name = 'Resort Admin'
  const role = 'admin'

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
  if (existing.length) {
    console.log(`Admin already exists (${email})`)
  } else {
    const hashed = await bcrypt.hash(password, 10)
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
      name,
      email,
      hashed,
      role,
    ])
    console.log(`Admin created: ${email} / ${password}`)
  }

  const [supplierCount] = await pool.query('SELECT COUNT(*) AS total FROM suppliers')
  if (supplierCount[0].total > 0) {
    console.log('Suppliers already seeded')
  } else {
    const supplierIdsByName = {}
    for (const supplier of supplierSeed) {
      const [result] = await pool.query(
        'INSERT INTO suppliers (name, contact) VALUES (?, ?)',
        [supplier.name, supplier.contact],
      )
      supplierIdsByName[supplier.name] = result.insertId
    }
    console.log(`Seeded ${supplierSeed.length} suppliers`)
  }

  const [itemCount] = await pool.query('SELECT COUNT(*) AS total FROM items')
  if (itemCount[0].total > 0) {
    console.log('Items already seeded')
  } else {
    const [suppliers] = await pool.query('SELECT id, name FROM suppliers')
    const idByName = Object.fromEntries(suppliers.map((s) => [s.name, s.id]))
    for (const item of itemSeed) {
      const [result] = await pool.query(
        `INSERT INTO items (name, sku, category, measured_by, unit, accounting_group, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.name,
          item.sku,
          item.category,
          item.measuredBy,
          item.unit,
          item.accountingGroup,
          item.description,
        ],
      )
      for (const supplierName of item.suppliers) {
        await pool.query(
          'INSERT INTO item_suppliers (item_id, supplier_id) VALUES (?, ?)',
          [result.insertId, idByName[supplierName]],
        )
      }
    }
    console.log(`Seeded ${itemSeed.length} items`)
  }

  const [priceCount] = await pool.query('SELECT COUNT(*) AS total FROM item_prices')
  if (priceCount[0].total > 0) {
    console.log('Item prices already seeded')
  } else {
    const [items] = await pool.query('SELECT id, name FROM items')
    let seeded = 0
    for (const item of items) {
      const price = priceSeed[item.name]
      if (!price) continue
      await pool.query(
        'INSERT INTO item_prices (item_id, cost_price, selling_price, effective_from) VALUES (?, ?, ?, ?)',
        [item.id, price.cost, price.sell, dateDaysAgo(90)],
      )
      seeded += 1
    }
    console.log(`Seeded ${seeded} item prices`)
  }

  const [countCount] = await pool.query('SELECT COUNT(*) AS total FROM stock_counts')
  if (countCount[0].total > 0) {
    console.log('Stock counts already seeded')
  } else {
    const [items] = await pool.query('SELECT id, name FROM items')
    const idByName = Object.fromEntries(items.map((i) => [i.name, i.id]))
    let seeded = 0
    for (const batch of countSeed) {
      const [header] = await pool.query(
        'INSERT INTO stock_counts (count_date, staff, notes) VALUES (?, ?, ?)',
        [dateDaysAgo(batch.daysAgo), batch.staff, batch.notes],
      )
      for (const line of batch.items) {
        const itemId = idByName[line.item]
        const price = priceSeed[line.item]
        if (!itemId || !price) continue
        await pool.query(
          `INSERT INTO stock_count_items (stock_count_id, item_id, system_qty, counted_qty, cost_price)
           VALUES (?, ?, ?, ?, ?)`,
          [header.insertId, itemId, line.system, line.counted, price.cost],
        )
      }
      seeded += 1
    }
    console.log(`Seeded ${seeded} stock count batches`)
  }

  const [movementCount] = await pool.query('SELECT COUNT(*) AS total FROM stock_movements')
  if (movementCount[0].total > 0) {
    console.log('Stock movements already seeded')
  } else {
    const [items] = await pool.query('SELECT id, name FROM items')
    const idByName = Object.fromEntries(items.map((i) => [i.name, i.id]))
    let seeded = 0
    for (const m of movementSeed) {
      const itemId = idByName[m.item]
      if (!itemId) continue
      await pool.query(
        'INSERT INTO stock_movements (item_id, direction, qty, unit_cost, reference) VALUES (?, ?, ?, ?, ?)',
        [itemId, m.direction, m.qty, m.unitCost ?? null, m.reference ?? null],
      )
      seeded += 1
    }
    console.log(`Seeded ${seeded} stock movements`)
  }

  const [acctCount] = await pool.query('SELECT COUNT(*) AS total FROM accounting_groups')
  if (acctCount[0].total > 0) {
    console.log('Accounting groups already seeded')
  } else {
    for (const group of ['Food', 'Beverage', 'Cleaning', 'Stationery', 'Maintenance']) {
      await pool.query('INSERT INTO accounting_groups (name) VALUES (?)', [group])
    }
    console.log('Seeded 5 accounting groups')
  }

  const [priceListCount] = await pool.query('SELECT COUNT(*) AS total FROM price_lists')
  if (priceListCount[0].total > 0) {
    console.log('Price lists already seeded')
  } else {
    await pool.query(
      "INSERT INTO price_lists (name, currency, is_default) VALUES ('Default', 'USD', 1)",
    )
    console.log('Seeded default price list')
  }

  const [menuPriceCount] = await pool.query('SELECT COUNT(*) AS total FROM menu_prices')
  if (menuPriceCount[0].total > 0) {
    console.log('Menu prices already seeded')
  } else {
    const [items] = await pool.query('SELECT id, name FROM items')
    const [lists] = await pool.query('SELECT id FROM price_lists ORDER BY id LIMIT 1')
    if (lists.length) {
      let seeded = 0
      for (const item of items) {
        const price = priceSeed[item.name]
        if (!price) continue
        await pool.query(
          'INSERT INTO menu_prices (item_id, price_list_id, price) VALUES (?, ?, ?)',
          [item.id, lists[0].id, price.sell],
        )
        seeded += 1
      }
      console.log(`Seeded ${seeded} menu prices`)
    }
  }

  await pool.end()
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
