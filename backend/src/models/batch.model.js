const { pool } = require('../config/db')
const { getCurrentPrice } = require('./price.model')
const { httpError } = require('../utils/errors')

function round2(n) {
  return Math.round(n * 100) / 100
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function mapLine(row) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.name,
    sku: row.sku,
    unit: row.unit,
    qty: Number(row.qty),
    unitCost: Number(row.unit_cost),
    value: round2(Number(row.qty) * Number(row.unit_cost)),
    isOutput: row.is_output === 1 || row.is_output === true,
    onHand: row.on_hand == null ? null : Number(row.on_hand),
  }
}

function mapBatch(row, lines) {
  const inputs = lines.filter((l) => !l.isOutput)
  const outputs = lines.filter((l) => l.isOutput)
  return {
    id: row.id,
    recipeId: row.recipe_id,
    recipeName: row.recipe_name || null,
    batchRef: row.batch_ref,
    date: row.batch_date,
    staff: row.staff,
    locationId: row.location_id ? Number(row.location_id) : null,
    locationName: row.location_name || null,
    notes: row.notes,
    status: row.status || 'in_progress',
    outputUnit: row.output_unit || null,
    finishedAt: row.finished_at || null,
    createdAt: row.created_at,
    lines,
    inputCount: inputs.length,
    inputQty: round2(inputs.reduce((s, l) => s + l.qty, 0)),
    inputCost: round2(inputs.reduce((s, l) => s + l.value, 0)),
    outputCount: outputs.length,
    outputQty: round2(outputs.reduce((s, l) => s + l.qty, 0)),
    outputCost: round2(outputs.reduce((s, l) => s + l.value, 0)),
  }
}

const BATCH_SELECT = `
  SELECT pb.*, r.name AS recipe_name, l.name AS location_name
  FROM production_batches pb
  LEFT JOIN recipes r ON r.id = pb.recipe_id
  LEFT JOIN locations l ON l.id = pb.location_id
`

// On-hand = net IN/OUT from the ledger, filtered to one location when the
// batch has one. Used to show how much is currently available per line.
const NET_SUM = `COALESCE(SUM(CASE WHEN sm.direction = 'IN' THEN sm.qty WHEN sm.direction = 'OUT' THEN -sm.qty END), 0)`

async function findLines(id, locationId) {
  const [rows] = await pool.query(
    `SELECT pbi.*, i.name, i.sku, i.unit,
       (${NET_SUM}) AS on_hand
     FROM production_batch_items pbi
     JOIN items i ON i.id = pbi.item_id
     LEFT JOIN stock_movements sm
       ON sm.item_id = pbi.item_id
       ${locationId ? 'AND sm.location_id = ?' : ''}
     WHERE pbi.batch_id = ?
     GROUP BY pbi.id, pbi.item_id, pbi.qty, pbi.unit_cost, pbi.is_output, i.name, i.sku, i.unit
     ORDER BY pbi.is_output DESC, i.name ASC`,
    locationId ? [locationId, id] : [id],
  )
  return rows.map(mapLine)
}

async function fetchBatch(id) {
  const [rows] = await pool.query(`${BATCH_SELECT} WHERE pb.id = ?`, [id])
  if (!rows.length) throw httpError('Production batch not found', 404)
  return mapBatch(rows[0], await findLines(id, rows[0].location_id))
}

async function listBatches({ days, status } = {}) {
  const where = []
  const params = []
  if (days) {
    where.push('pb.batch_date >= CURDATE() - INTERVAL ? DAY')
    params.push(Number(days))
  }
  if (status === 'in_progress' || status === 'finished') {
    where.push('pb.status = ?')
    params.push(status)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const [rows] = await pool.query(
    `${BATCH_SELECT}
     ${whereSql}
     ORDER BY pb.batch_date DESC, pb.id DESC`,
    params,
  )
  const batches = []
  for (const row of rows) {
    batches.push(mapBatch(row, await findLines(row.id, row.location_id)))
  }
  return batches
}

// Runs one batch of a recipe. For a made-in-batches recipe the scale factor
// `qty` multiplies every recipe line, so one recipe can make any number of
// batches. For a made-to-order recipe `outputQty` is the number of units to
// produce and each ingredient line (defined per unit) scales by that many.
// Ingredients leave the ledger as OUT movements and the output arrives as an
// IN movement, all type='production'; unit costs are snapshotted from the
// current item price, and the output is valued at total ingredient cost.
async function runBatch({
  recipeId,
  batchRef,
  batchDate,
  staff,
  locationId,
  notes,
  qty,
  outputQty,
  outputQtyOverride,
  outputUnitOverride,
  status,
}) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    if (!staff) throw httpError('Staff is required')
    if (!locationId) throw httpError('A location is required')

    const [recipeRows] = await connection.query('SELECT * FROM recipes WHERE id = ? FOR UPDATE', [recipeId])
    if (!recipeRows.length) throw httpError('Recipe not found', 404)
    const recipe = recipeRows[0]
    const isMadeToOrder = recipe.type === 'made_to_order'

    // Compute how many output units this batch produces and the multiplier
    // applied to every ingredient line. The actual output can be overridden
    // from the recipe default at run time.
    let outputQtyN
    let scale
    if (isMadeToOrder) {
      outputQtyN = Number(outputQty)
      if (!(outputQtyN > 0)) throw httpError('Output quantity is required for made-to-order recipes')
      scale = outputQtyN
    } else {
      const multiplier = Number(qty) || 1
      if (!(multiplier > 0)) throw httpError('Batch quantity must be positive')
      scale = multiplier
      const recipeOutput = round2(Number(recipe.output_qty) * multiplier)
      const override = Number(outputQtyOverride)
      outputQtyN = override > 0 ? round2(override) : recipeOutput
    }
    const outputUnit = outputUnitOverride || recipe.output_unit || null
    const statusValue = status === 'finished' ? 'finished' : 'in_progress'

    const [ingredientRows] = await connection.query(
      `SELECT ri.*, i.name, i.sku, i.unit AS item_unit
       FROM recipe_items ri
       JOIN items i ON i.id = ri.item_id
       WHERE ri.recipe_id = ?
       ORDER BY i.name ASC`,
      [recipeId],
    )
    if (!ingredientRows.length) throw httpError('Recipe has no ingredients', 400)

    const [locRows] = await connection.query('SELECT id FROM locations WHERE id = ?', [locationId])
    if (!locRows.length) throw httpError(`Location ${locationId} not found`, 404)

    // Snapshot costs and compute the ingredient totals.
    const inputs = []
    let totalInputCost = 0
    for (const row of ingredientRows) {
      const lineQty = round2(Number(row.qty) * scale)
      const price = await getCurrentPrice(row.item_id)
      const unitCost = price ? price.costPrice : 0
      const value = round2(lineQty * unitCost)
      totalInputCost += value
      inputs.push({ ...row, qty: lineQty, unitCost, value })
    }
    const outputUnitCost = outputQtyN > 0 ? round2(totalInputCost / outputQtyN) : 0

    const [header] = await connection.query(
      `INSERT INTO production_batches (recipe_id, batch_ref, batch_date, staff, location_id, notes, status, output_qty, output_unit, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipeId,
        batchRef || null,
        batchDate || today(),
        staff,
        locationId,
        notes || null,
        statusValue,
        outputQtyN,
        outputUnit,
        statusValue === 'finished' ? new Date() : null,
      ],
    )
    const batchId = header.insertId
    const reference = batchRef || `Batch #${batchId}`

    for (const line of inputs) {
      await connection.query(
        `INSERT INTO production_batch_items (batch_id, item_id, qty, unit_cost, is_output)
         VALUES (?, ?, ?, ?, 0)`,
        [batchId, line.item_id, line.qty, line.unitCost],
      )
      await connection.query(
        `INSERT INTO stock_movements (item_id, direction, qty, unit_cost, type, reason, staff, location_id, reference)
         VALUES (?, 'OUT', ?, ?, 'production', ?, ?, ?, ?)`,
        [line.item_id, line.qty, line.unitCost, recipe.name, staff, locationId, reference],
      )
    }

    await connection.query(
      `INSERT INTO production_batch_items (batch_id, item_id, qty, unit_cost, is_output)
       VALUES (?, ?, ?, ?, 1)`,
      [batchId, recipe.output_item_id, outputQtyN, outputUnitCost],
    )
    await connection.query(
      `INSERT INTO stock_movements (item_id, direction, qty, unit_cost, type, reason, staff, location_id, reference)
       VALUES (?, 'IN', ?, ?, 'production', ?, ?, ?, ?)`,
      [recipe.output_item_id, outputQtyN, outputUnitCost, recipe.name, staff, locationId, reference],
    )

    await connection.commit()
    return await fetchBatch(batchId)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Marks a run as finished (or reopens it). finished_at is set when finished.
async function setStatus(id, status) {
  const value = status === 'finished' ? 'finished' : 'in_progress'
  const [result] = await pool.query(
    'UPDATE production_batches SET status = ?, finished_at = ? WHERE id = ?',
    [value, value === 'finished' ? new Date() : null, id],
  )
  if (!result.affectedRows) throw httpError('Production batch not found', 404)
  return fetchBatch(id)
}

module.exports = { runBatch, listBatches, fetchBatch, setStatus }
