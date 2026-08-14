const express = require('express')
const { posOrderModel, salePeriodModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

// Orders for this device's outlet (optionally filtered by sale period or date).
router.get('/', verifyDevice, async (req, res, next) => {
  try {
    res.json(
      await posOrderModel.listByOutlet(req.device.outletId, {
        periodId: req.query.periodId,
        date: req.query.date,
        limit: req.query.limit,
      }),
    )
  } catch (error) {
    next(error)
  }
})

// Place and pay an order. Requires an open sales period for the outlet.
router.post('/', verifyDevice, async (req, res, next) => {
  try {
    const { items, discount, paymentMethod, paymentReceived, salePeriodId } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' })
    }
    const period = salePeriodId
      ? await salePeriodModel.findById(salePeriodId)
      : await salePeriodModel.findOpenByOutlet(req.device.outletId)
    if (!period) return res.status(409).json({ message: 'No open sales period for this outlet' })
    if (period.closedAt) return res.status(409).json({ message: 'Sales period is closed' })

    const order = await posOrderModel.create({
      outletId: req.device.outletId,
      deviceId: req.device.deviceId,
      staffId: req.body.staffId || null,
      salePeriodId: period.id,
      items,
      discount,
      paymentMethod,
      paymentReceived,
    })
    res.status(201).json(order)
  } catch (error) {
    next(error)
  }
})

module.exports = router
