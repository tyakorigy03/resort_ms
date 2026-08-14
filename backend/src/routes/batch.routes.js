const express = require('express')
const { batchModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { days, status } = req.query
    res.json(await batchModel.listBatches({ days: days || undefined, status }))
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const {
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
    } = req.body
    res.status(201).json(
      await batchModel.runBatch({
        recipeId: recipeId ? Number(recipeId) : null,
        batchRef,
        batchDate,
        staff,
        locationId: locationId ? Number(locationId) : null,
        notes,
        qty,
        outputQty,
        outputQtyOverride,
        outputUnitOverride,
        status,
      }),
    )
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/status', verifyToken, async (req, res, next) => {
  try {
    const { status } = req.body
    if (status !== 'in_progress' && status !== 'finished') {
      return res.status(400).json({ message: 'Invalid status' })
    }
    res.json(await batchModel.setStatus(Number(req.params.id), status))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    res.json(await batchModel.fetchBatch(Number(req.params.id)))
  } catch (error) {
    next(error)
  }
})

module.exports = router
