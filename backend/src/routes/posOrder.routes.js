const express = require('express')
const { posOrderModel, orderCourseModel, salePeriodModel } = require('../models')
const { verifyDevice, verifyAny } = require('../middlewares/auth')

const router = express.Router()

// Find the order of this device's outlet or bail with 404.
async function loadOrder(id, outletId) {
  const order = await posOrderModel.findById(id)
  if (!order || order.outletId !== outletId) return null
  return order
}

// Orders for this device's outlet. Filters: date, periodId, status, orderType, search.
router.get('/', verifyDevice, async (req, res, next) => {
  try {
    res.json(
      await posOrderModel.listByOutlet(req.device.outletId, {
        periodId: req.query.periodId,
        date: req.query.date,
        status: req.query.status,
        orderType: req.query.orderType,
        search: req.query.search,
        limit: req.query.limit,
      }),
    )
  } catch (error) {
    next(error)
  }
})

// Dashboard counters. Works for backoffice users and POS devices.
router.get('/stats', verifyAny, async (req, res, next) => {
  try {
    res.json(await posOrderModel.getStats())
  } catch (error) {
    next(error)
  }
})

// Open a new order. Requires an open sales period for the outlet. A table
// session seats the order; without one the order is pickup/delivery.
router.post('/', verifyDevice, async (req, res, next) => {
  try {
    const { tableSessionId, orderType, collectionCode, covers, customerId } = req.body
    const period = await salePeriodModel.findOpenByOutlet(req.device.outletId)
    if (!period) return res.status(409).json({ message: 'No open sales period for this outlet' })
    const order = await posOrderModel.createOpen({
      outletId: req.device.outletId,
      deviceId: req.device.deviceId,
      staffId: req.body.staffId || null,
      salePeriodId: period.id,
      tableSessionId: tableSessionId || null,
      orderType: orderType || 'dine_in',
      collectionCode,
      covers,
      customerId,
    })
    res.status(201).json(order)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (error) {
    next(error)
  }
})

// Update covers / customer / collection code / order type of an open order.
router.put('/:id', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(await posOrderModel.updateOrder(order.id, req.body))
  } catch (error) {
    next(error)
  }
})

// Add items to an open order (course + seat assignable per line).
router.post('/:id/items', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.status(201).json(await posOrderModel.addItems(order.id, req.body.items))
  } catch (error) {
    next(error)
  }
})

// Remove an unfired line entirely.
router.delete('/:id/items/:itemId', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(await posOrderModel.removeItem(order.id, req.params.itemId))
  } catch (error) {
    next(error)
  }
})

// Refund a line (cancel on the KDS, excluded from totals).
router.post('/:id/items/:itemId/refund', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(await posOrderModel.refundItem(order.id, req.params.itemId))
  } catch (error) {
    next(error)
  }
})

// Move a line between courses and/or seats.
router.patch('/:id/items/:itemId/move', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(await posOrderModel.moveItem(order.id, req.params.itemId, req.body))
  } catch (error) {
    next(error)
  }
})

// Add a course to an open order.
router.post('/:id/courses', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.status(201).json(await orderCourseModel.addCourse(order.id))
  } catch (error) {
    next(error)
  }
})

// Fire a course to the kitchen.
router.post('/:id/courses/:courseId/fire', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(await orderCourseModel.fireCourse(order.id, req.params.courseId))
  } catch (error) {
    next(error)
  }
})

// Set a course's status (e.g. on_hold from the register).
router.patch('/:id/courses/:courseId/status', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(await orderCourseModel.setStatus(order.id, req.params.courseId, req.body.status))
  } catch (error) {
    next(error)
  }
})

// Split the open order into one order per distinct seat.
router.post('/:id/split', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(await posOrderModel.splitCheck(order.id))
  } catch (error) {
    next(error)
  }
})

// Pay an open order (writes stock movements, closes the table session).
router.post('/:id/checkout', verifyDevice, async (req, res, next) => {
  try {
    const order = await loadOrder(req.params.id, req.device.outletId)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    const period = await salePeriodModel.findById(order.salePeriodId)
    if (!period) return res.status(409).json({ message: 'Sales period no longer exists' })
    if (period.closedAt) return res.status(409).json({ message: 'Sales period is closed' })
    res.json(
      await posOrderModel.checkout(order.id, {
        paymentMethod: req.body.paymentMethod,
        paymentReceived: req.body.paymentReceived,
        discount: req.body.discount,
        tip: req.body.tip,
      }),
    )
  } catch (error) {
    next(error)
  }
})

module.exports = router
