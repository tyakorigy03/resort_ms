const { pool } = require('../config/db')
const { httpError } = require('../utils/errors')

function round2(n) {
  return Math.round(n * 100) / 100
}

function mapRecipe(row, ingredients, batchCount = 0) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    outputItemId: row.output_item_id,
    outputItemName: row.output_name || null,
    outputSku: row.output_sku || null,
    outputUnit: row.output_unit || row.output_item_unit || null,
    outputQty: row.output_qty == null ? null : Number(row.output_qty),
    notes: row.notes,
    ingredientCount: ingredients.length,
    ingredients,
    batchCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapIngredient(row) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.name,
    sku: row.sku,
    unit: row.unit || row.item_unit || null,
    qty: Number(row.qty),
  }
}

async function findIngredients(recipeId) {
  const [rows] = await pool.query(
    `SELECT ri.*, i.name, i.sku, i.unit AS item_unit
     FROM recipe_items ri
     JOIN items i ON i.id = ri.item_id
     WHERE ri.recipe_id = ?
     ORDER BY i.name ASC`,
    [recipeId],
  )
  return rows.map(mapIngredient)
}

async function findBatchCount(recipeId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM production_batches WHERE recipe_id = ?',
    [recipeId],
  )
  return Number(rows[0].cnt)
}

const RECIPE_SELECT = `
  SELECT r.*, oi.name AS output_name, oi.sku AS output_sku, oi.unit AS output_item_unit
  FROM recipes r
  JOIN items oi ON oi.id = r.output_item_id
`

async function fetchRecipe(id) {
  const [rows] = await pool.query(`${RECIPE_SELECT} WHERE r.id = ?`, [id])
  if (!rows.length) throw httpError('Recipe not found', 404)
  return mapRecipe(rows[0], await findIngredients(id), await findBatchCount(id))
}

async function listRecipes() {
  const [rows] = await pool.query(
    `${RECIPE_SELECT}
     ORDER BY r.name ASC`,
  )
  const recipes = []
  for (const row of rows) {
    recipes.push(mapRecipe(row, await findIngredients(row.id), await findBatchCount(row.id)))
  }
  return recipes
}

// Creates a recipe template for an existing item (the output). The recipe name
// mirrors the item name; one item can only have one recipe. Made-in-batches
// recipes carry a fixed output quantity per batch; made-to-order recipes
// define ingredient quantities per one unit and have no output quantity.
async function createRecipe({ description, type, outputItemId, outputQty, outputUnit, notes, ingredients }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    if (!outputItemId || !ingredients || !ingredients.length) {
      throw httpError('An item and at least one ingredient are required')
    }
    const recipeType = type === 'made_to_order' ? 'made_to_order' : 'made_in_batches'
    const outputQtyN = Number(outputQty)
    if (recipeType === 'made_in_batches' && !(outputQtyN > 0)) {
      throw httpError('A batch quantity is required for made-in-batches recipes')
    }

    const [outRows] = await connection.query('SELECT id, name FROM items WHERE id = ?', [outputItemId])
    if (!outRows.length) throw httpError(`Item ${outputItemId} not found`, 404)
    const itemName = outRows[0].name

    const seen = new Set()
    for (const line of ingredients) {
      if (!line.itemId || !(Number(line.qty) > 0)) {
        throw httpError('Each ingredient needs an item and a positive quantity')
      }
      if (seen.has(line.itemId)) throw httpError('Duplicate ingredient in recipe')
      seen.add(line.itemId)
      const [itemRows] = await connection.query('SELECT id FROM items WHERE id = ?', [line.itemId])
      if (!itemRows.length) throw httpError(`Ingredient item ${line.itemId} not found`, 404)
    }

    let recipeId
    try {
      const [header] = await connection.query(
        `INSERT INTO recipes (name, description, output_item_id, output_qty, output_unit, type, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          itemName,
          description || null,
          outputItemId,
          recipeType === 'made_in_batches' ? outputQtyN : null,
          outputUnit || null,
          recipeType,
          notes || null,
        ],
      )
      recipeId = header.insertId
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw httpError('A recipe already exists for this item', 400)
      }
      throw error
    }

    for (const line of ingredients) {
      await connection.query(
        'INSERT INTO recipe_items (recipe_id, item_id, qty, unit) VALUES (?, ?, ?, ?)',
        [recipeId, line.itemId, Number(line.qty), line.unit || null],
      )
    }

    await connection.commit()
    return await fetchRecipe(recipeId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

async function updateRecipe(id, { description, type, outputItemId, outputQty, outputUnit, notes, ingredients }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const [oldRows] = await connection.query('SELECT id FROM recipes WHERE id = ?', [id])
    if (!oldRows.length) throw httpError('Recipe not found', 404)
    if (!outputItemId || !ingredients || !ingredients.length) {
      throw httpError('An item and at least one ingredient are required')
    }
    const recipeType = type === 'made_to_order' ? 'made_to_order' : 'made_in_batches'
    const outputQtyN = Number(outputQty)
    if (recipeType === 'made_in_batches' && !(outputQtyN > 0)) {
      throw httpError('A batch quantity is required for made-in-batches recipes')
    }

    const [outRows] = await connection.query('SELECT id, name FROM items WHERE id = ?', [outputItemId])
    if (!outRows.length) throw httpError(`Item ${outputItemId} not found`, 404)
    const itemName = outRows[0].name

    const seen = new Set()
    for (const line of ingredients) {
      if (!line.itemId || !(Number(line.qty) > 0)) {
        throw httpError('Each ingredient needs an item and a positive quantity')
      }
      if (seen.has(line.itemId)) throw httpError('Duplicate ingredient in recipe')
      seen.add(line.itemId)
      const [itemRows] = await connection.query('SELECT id FROM items WHERE id = ?', [line.itemId])
      if (!itemRows.length) throw httpError(`Ingredient item ${line.itemId} not found`, 404)
    }

    try {
      await connection.query(
        `UPDATE recipes SET name = ?, description = ?, output_item_id = ?, output_qty = ?, output_unit = ?, type = ?, notes = ?
         WHERE id = ?`,
        [
          itemName,
          description || null,
          outputItemId,
          recipeType === 'made_in_batches' ? outputQtyN : null,
          outputUnit || null,
          recipeType,
          notes || null,
          id,
        ],
      )
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw httpError('A recipe already exists for this item', 400)
      }
      throw error
    }
    await connection.query('DELETE FROM recipe_items WHERE recipe_id = ?', [id])
    for (const line of ingredients) {
      await connection.query(
        'INSERT INTO recipe_items (recipe_id, item_id, qty, unit) VALUES (?, ?, ?, ?)',
        [id, line.itemId, Number(line.qty), line.unit || null],
      )
    }

    await connection.commit()
    return await fetchRecipe(id)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// A recipe that already has production batches cannot be deleted, so history
// keeps pointing at a valid template.
async function deleteRecipe(id) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query('SELECT id FROM recipes WHERE id = ?', [id])
    if (!rows.length) throw httpError('Recipe not found', 404)
    const [batchRows] = await connection.query(
      'SELECT id FROM production_batches WHERE recipe_id = ? LIMIT 1',
      [id],
    )
    if (batchRows.length) {
      throw httpError('Cannot delete a recipe that already has production batches', 400)
    }
    await connection.query('DELETE FROM recipes WHERE id = ?', [id])
    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = { listRecipes, fetchRecipe, createRecipe, updateRecipe, deleteRecipe }
