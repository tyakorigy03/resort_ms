const express = require('express')
const { stockCountModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const days = req.query.days ? Number(req.query.days) : null
    res.json(await stockCountModel.listStockCounts({ days }))
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { countDate, staff, notes, items, locationId } = req.body
    if (!staff || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Staff and at least one item are required' })
    }
    if (!locationId) {
      return res.status(400).json({ message: 'A location is required' })
    }
    for (const line of items) {
      if (!line.itemId || line.countedQty === undefined || line.countedQty === null) {
        return res.status(400).json({ message: 'Each item needs an item and counted quantity' })
      }
    }
    res.status(201).json(
      await stockCountModel.createStockCount({ countDate, staff, notes, items, locationId }),
    )
  } catch (error) {
    next(error)
  }
})

module.exports = router
