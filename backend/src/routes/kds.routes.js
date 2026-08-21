const express = require('express')
const { kdsModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')
const sse = require('../utils/sse')

const router = express.Router()

// A KDS device must be paired to a production center.
function requireStation(req, res, next) {
  if (!req.device.productionCenterId) {
    return res.status(409).json({ message: 'This device has no kitchen station assigned. Pair it in the backoffice.' })
  }
  next()
}

// Open kitchen tickets for this station.
router.get('/tickets', verifyDevice, requireStation, async (req, res, next) => {
  try {
    res.json(await kdsModel.getTickets(req.device.productionCenterId))
  } catch (error) {
    next(error)
  }
})

// Advance a single item's kitchen status.
router.patch('/items/:itemId/status', verifyDevice, requireStation, async (req, res, next) => {
  try {
    const result = await kdsModel.updateItemStatus(req.params.itemId, req.device.productionCenterId, req.body.status)
    sse.broadcastOrderChanged(result.orderId)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

module.exports = router
