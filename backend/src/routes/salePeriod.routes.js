const express = require('express')
const { clockModel, salePeriodModel, staffModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

// Current open sales period for this device's outlet (null when closed).
router.get('/current', verifyDevice, async (req, res, next) => {
  try {
    res.json(await salePeriodModel.findOpenByOutlet(req.device.outletId))
  } catch (error) {
    next(error)
  }
})

// Recent sales periods for this device's outlet.
router.get('/', verifyDevice, async (req, res, next) => {
  try {
    res.json(await salePeriodModel.listByOutlet(req.device.outletId, { limit: req.query.limit }))
  } catch (error) {
    next(error)
  }
})

// Resolve the manager behind a period open/close request: their PIN alone
// identifies them, and their role must hold the permission.
async function authorizeManager(pin, permission) {
  if (!pin) {
    const err = new Error('A manager PIN is required')
    err.status = 400
    throw err
  }
  const staffId = await staffModel.findManagerByPin(pin, permission)
  if (!staffId) {
    const err = new Error('Invalid PIN')
    err.status = 401
    throw err
  }
  return staffId
}

// Manager opens the sales period for the device's outlet (PIN identifies them).
router.post('/open', verifyDevice, async (req, res, next) => {
  try {
    const openedByStaffId = await authorizeManager(req.body.pin, 'sale_period.open')
    const period = await salePeriodModel.open({
      outletId: req.device.outletId,
      openedOnDeviceId: req.device.deviceId,
      openedByStaffId,
      openingNotes: req.body.notes || null,
    })
    res.status(201).json(period)
  } catch (error) {
    next(error)
  }
})

// Per-shift till reconciliation for a sales period (read-only report).
router.get('/:id/cash', verifyDevice, async (req, res, next) => {
  try {
    const period = await salePeriodModel.findById(req.params.id)
    if (!period) return res.status(404).json({ message: 'Sales period not found' })
    const shifts = await clockModel.findShiftsForPeriod(period)
    res.json({ period, shifts })
  } catch (error) {
    next(error)
  }
})

// Manager closes the sales period (PIN identifies them).
router.post('/:id/close', verifyDevice, async (req, res, next) => {
  try {
    const closedByStaffId = await authorizeManager(req.body.pin, 'sale_period.close')

    // Workflow gate: everyone must be clocked out before the day is closed.
    const activeShifts = await clockModel.findActiveByOutlet(req.device.outletId)
    if (activeShifts.length) {
      const names = activeShifts.map((s) => s.staffName).join(', ')
      return res.status(409).json({
        message: `${names} ${activeShifts.length === 1 ? 'is' : 'are'} still clocked in. Clock everyone out before closing the sales period.`,
      })
    }

    res.json(
      await salePeriodModel.close(req.params.id, {
        closedByStaffId,
        closedOnDeviceId: req.device.deviceId,
        closingNotes: req.body.notes || null,
      }),
    )
  } catch (error) {
    next(error)
  }
})

module.exports = router
