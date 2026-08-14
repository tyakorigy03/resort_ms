const { pool } = require('../config/db')
const { deleteUpload } = require('../utils/upload')

function mapItem(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    measuredBy: row.measured_by,
    unit: row.unit,
    accountingGroup: row.accounting_group,
    description: row.description,
    image: row.image,
  }
}

async function attachSuppliers(items) {
  if (items.length === 0) return
  const ids = items.map((item) => item.id)
  const placeholders = ids.map(() => '?').join(', ')
  const [rows] = await pool.query(
    `SELECT link.item_id, s.id, s.name, s.contact
     FROM item_suppliers link
     JOIN suppliers s ON s.id = link.supplier_id
     WHERE link.item_id IN (${placeholders})
     ORDER BY s.name ASC`,
    ids,
  )
  const byItem = new Map()
  for (const row of rows) {
    if (!byItem.has(row.item_id)) byItem.set(row.item_id, [])
    byItem.get(row.item_id).push({ id: row.id, name: row.name, contact: row.contact })
  }
  for (const item of items) {
    item.suppliers = byItem.get(item.id) ?? []
  }
}

async function attachPrices(items) {
  if (items.length === 0) return
  const ids = items.map((item) => item.id)
  const placeholders = ids.map(() => '?').join(', ')
  const [rows] = await pool.query(
    `SELECT mp.item_id, mp.price_list_id, mp.price, pl.name AS price_list_name, pl.currency, pl.is_default
     FROM menu_prices mp
     JOIN price_lists pl ON pl.id = mp.price_list_id
     WHERE mp.item_id IN (${placeholders})
     ORDER BY pl.is_default DESC, pl.name ASC`,
    ids,
  )
  const byItem = new Map()
  for (const row of rows) {
    if (!byItem.has(row.item_id)) byItem.set(row.item_id, [])
    byItem.get(row.item_id).push({
      priceListId: row.price_list_id,
      priceListName: row.price_list_name,
      currency: row.currency,
      isDefault: !!row.is_default,
      price: Number(row.price),
    })
  }
  for (const item of items) {
    const prices = byItem.get(item.id) ?? []
    item.prices = prices
    item.mainPrice = prices.find((p) => p.isDefault)?.price ?? null
  }
}

async function ensureDefaultPriceList() {
  const [rows] = await pool.query(
    'SELECT id FROM price_lists WHERE is_default = 1 ORDER BY id LIMIT 1',
  )
  if (rows.length) return rows[0].id
  const [result] = await pool.query(
    'INSERT INTO price_lists (name, currency, is_default) VALUES (?, ?, 1)',
    ['Default', 'USD'],
  )
  return result.insertId
}

async function setMenuPrices(connection, itemId, prices = []) {
  if (!Array.isArray(prices)) return
  await connection.query('DELETE FROM menu_prices WHERE item_id = ?', [itemId])
  if (prices.length === 0) return
  const valid = prices.filter((p) => Number(p.priceListId) && !Number.isNaN(Number(p.price)) && Number(p.price) >= 0)
  if (valid.length === 0) return
  await ensureDefaultPriceList()
  for (const p of valid) {
    await connection.query(
      'INSERT INTO menu_prices (item_id, price_list_id, price) VALUES (?, ?, ?)',
      [itemId, Number(p.priceListId), Number(p.price)],
    )
  }
}

async function createBatch(rows) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const created = []
    for (const row of rows) {
      const [result] = await connection.query(
        `INSERT INTO items (name, measured_by, unit, accounting_group)
         VALUES (?, 'Units', 'Piece', ?)`,
        [row.name, row.accountingGroup || null],
      )
      const id = result.insertId
      if (row.price !== undefined && row.price !== null && row.price !== '') {
        const defaultListId = await ensureDefaultPriceList()
        await setMenuPrices(connection, id, [{ priceListId: defaultListId, price: Number(row.price) }])
      }
      created.push(id)
    }
    await connection.commit()
    return findByIds(created)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function findByIds(ids) {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(', ')
  const [rows] = await pool.query(`SELECT * FROM items WHERE id IN (${placeholders}) ORDER BY id ASC`, ids)
  const items = rows.map(mapItem)
  await attachSuppliers(items)
  await attachPrices(items)
  return items
}

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM items ORDER BY name ASC')
  const items = rows.map(mapItem)
  await attachSuppliers(items)
  await attachPrices(items)
  return items
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [id])
  const item = mapItem(rows[0])
  if (!item) return null
  await attachSuppliers([item])
  await attachPrices([item])
  return item
}

async function setSuppliers(connection, itemId, supplierIds = []) {
  await connection.query('DELETE FROM item_suppliers WHERE item_id = ?', [itemId])
  for (const supplierId of supplierIds) {
    await connection.query(
      'INSERT INTO item_suppliers (item_id, supplier_id) VALUES (?, ?)',
      [itemId, supplierId],
    )
  }
}

async function create(data) {
  const {
    name,
    sku,
    category,
    measuredBy,
    unit,
    accountingGroup,
    description,
    image,
    supplierIds,
    prices,
  } = data
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.query(
      `INSERT INTO items (name, sku, category, measured_by, unit, accounting_group, description, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        sku || null,
        category || null,
        measuredBy || 'Units',
        unit || 'Piece',
        accountingGroup || null,
        description || null,
        image || null,
      ],
    )
    await setSuppliers(connection, result.insertId, supplierIds)
    await setMenuPrices(connection, result.insertId, prices)
    await connection.commit()
    return findById(result.insertId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function update(id, data) {
  const {
    name,
    sku,
    category,
    measuredBy,
    unit,
    accountingGroup,
    description,
    image,
    supplierIds,
    prices,
  } = data
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [oldRows] = await connection.query('SELECT image FROM items WHERE id = ?', [id])
    if (!oldRows.length) {
      await connection.rollback()
      return null
    }
    const oldImage = oldRows[0].image
    await connection.query(
      `UPDATE items
       SET name = ?, sku = ?, category = ?, measured_by = ?, unit = ?, accounting_group = ?, description = ?, image = ?
       WHERE id = ?`,
      [
        name,
        sku || null,
        category || null,
        measuredBy || 'Units',
        unit || 'Piece',
        accountingGroup || null,
        description || null,
        image || null,
        id,
      ],
    )
    await setSuppliers(connection, id, supplierIds)
    await setMenuPrices(connection, id, prices)
    await connection.commit()
    if (image !== oldImage) deleteUpload(oldImage)
    return findById(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function remove(id) {
  const [rows] = await pool.query('SELECT image FROM items WHERE id = ?', [id])
  const image = rows[0]?.image
  const [result] = await pool.query('DELETE FROM items WHERE id = ?', [id])
  if (result.affectedRows > 0) deleteUpload(image)
  return result.affectedRows > 0
}

module.exports = { findAll, findById, findByIds, create, createBatch, update, remove }
