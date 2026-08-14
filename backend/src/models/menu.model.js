const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function mapConfig(config) {
  if (config === null || config === undefined) return null
  if (typeof config === 'string') return config
  return JSON.stringify(config)
}

async function attachScreens(menus) {
  if (menus.length === 0) return
  const ids = menus.map((m) => m.id)
  const placeholders = ids.map(() => '?').join(', ')
  const [screenRows] = await pool.query(
    `SELECT id, menu_id, name, sort_order
     FROM menu_screens
     WHERE menu_id IN (${placeholders})
     ORDER BY sort_order ASC, id ASC`,
    ids,
  )
  const byMenu = new Map()
  for (const row of screenRows) {
    if (!byMenu.has(row.menu_id)) byMenu.set(row.menu_id, [])
    byMenu.get(row.menu_id).push({ id: row.id, name: row.name })
  }
  const itemsByScreen = new Map()
  if (screenRows.length) {
    const screenIds = screenRows.map((s) => s.id)
    const screenPlaceholders = screenIds.map(() => '?').join(', ')
    const [itemRows] = await pool.query(
      `SELECT msi.menu_screen_id, msi.item_id, msi.sort_order, i.name AS item_name, i.unit,
              mp.price AS item_price
       FROM menu_screen_items msi
       JOIN items i ON i.id = msi.item_id
       LEFT JOIN price_lists pl ON pl.is_default = 1
       LEFT JOIN menu_prices mp ON mp.item_id = msi.item_id AND mp.price_list_id = pl.id
       WHERE msi.menu_screen_id IN (${screenPlaceholders})
       ORDER BY msi.sort_order ASC, i.name ASC`,
      screenIds,
    )
    for (const row of itemRows) {
      if (!itemsByScreen.has(row.menu_screen_id)) itemsByScreen.set(row.menu_screen_id, [])
      itemsByScreen.get(row.menu_screen_id).push({
        itemId: row.item_id,
        itemName: row.item_name,
        unit: row.unit,
        itemPrice: row.item_price === null ? null : Number(row.item_price),
      })
    }
  }
  for (const menu of menus) {
    const screens = byMenu.get(menu.id) ?? []
    for (const screen of screens) {
      screen.items = itemsByScreen.get(screen.id) ?? []
    }
    menu.screens = screens
  }
}

async function findAll() {
  const [rows] = await pool.query(
    `SELECT m.id, m.name, m.description, m.is_active, m.created_at,
            COUNT(DISTINCT ms.id) AS screen_count,
            COUNT(msi.id) AS item_count
     FROM menus m
     LEFT JOIN menu_screens ms ON ms.menu_id = m.id
     LEFT JOIN menu_screen_items msi ON msi.menu_screen_id = ms.id
     GROUP BY m.id, m.name, m.description, m.is_active, m.created_at
     ORDER BY m.name ASC`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isActive: Boolean(r.is_active),
    screenCount: Number(r.screen_count),
    itemCount: Number(r.item_count),
  }))
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, description, is_active FROM menus WHERE id = ?', [id])
  if (!rows.length) return null
  const menu = {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    isActive: Boolean(rows[0].is_active),
  }
  await attachScreens([menu])
  return menu
}

async function setScreens(connection, menuId, screens = []) {
  await connection.query('DELETE FROM menu_screens WHERE menu_id = ?', [menuId])
  let screenOrder = 0
  for (const screen of screens) {
    const name = (screen.name || '').trim()
    if (!name) continue
    screenOrder += 1
    const [result] = await connection.query(
      'INSERT INTO menu_screens (menu_id, name, sort_order) VALUES (?, ?, ?)',
      [menuId, name, screenOrder],
    )
    const items = Array.isArray(screen.items) ? screen.items : []
    let itemOrder = 0
    for (const line of items) {
      const itemId = Number(line.itemId)
      if (!itemId) continue
      itemOrder += 1
      await connection.query(
        'INSERT INTO menu_screen_items (menu_screen_id, item_id, sort_order) VALUES (?, ?, ?)',
        [result.insertId, itemId, itemOrder],
      )
    }
  }
}

async function create({ name, description, isActive, config, screens }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.query(
      'INSERT INTO menus (name, description, is_active, config) VALUES (?, ?, ?, ?)',
      [name, description || null, isActive === false ? 0 : 1, mapConfig(config)],
    )
    await setScreens(connection, result.insertId, screens)
    await connection.commit()
    return findById(result.insertId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function update(id, { name, description, isActive, config, screens }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [result] = await connection.query(
      'UPDATE menus SET name = ?, description = ?, is_active = ?, config = ? WHERE id = ?',
      [name, description || null, isActive === false ? 0 : 1, mapConfig(config), id],
    )
    if (result.affectedRows === 0) throw httpError('Menu not found', 404)
    await setScreens(connection, id, screens)
    await connection.commit()
    return findById(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function setActive(id, isActive) {
  const [result] = await pool.query('UPDATE menus SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id])
  if (result.affectedRows === 0) throw httpError('Menu not found', 404)
  return findById(id)
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM menus WHERE id = ?', [id])
  if (result.affectedRows === 0) throw httpError('Menu not found', 404)
}

module.exports = { findAll, findById, create, update, setActive, remove }
