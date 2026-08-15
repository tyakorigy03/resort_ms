const express = require('express')
const { cashDrawerModel, deviceModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

// Spec 3.2 cash-drawer gate. A "cash drawer" is a device record; on a register
// the POS device itself acts as the drawer. The device token's outlet must own
// the drawer device.
async function resolveDrawer(req, res, next) {
  try {
    const drawer = await deviceModel.findById(Number(req.params.drawerId))
    if (!drawer || drawer.outletId !== req.device.outletId) {
      return res.status(404).json({ message: 'Cash drawer not found' })
    }
    req.drawer = drawer
    next()
  } catch (error) {
    next(error)
  }
}

// Returns whether a count already exists for this drawer today, so the register
// knows whether to show the gate.
router.get('/:drawerId/today', verifyDevice, resolveDrawer, async (req, res, next) => {
  try {
    const count = await cashDrawerModel.findToday(req.drawer.id)
    res.json({
      hasCountToday: Boolean(count),
      count,
    })
  } catch (error) {
    next(error)
  }
})

// Confirms today's opening cash for the drawer. Idempotent: re-confirming
// updates the amount but keeps the first confirmation timestamp.
router.post('/:drawerId/confirm', verifyDevice, resolveDrawer, async (req, res, next) => {
  try {
    const { openingCount } = req.body
    if (openingCount === undefined || openingCount === null || Number(openingCount) < 0) {
      return res.status(400).json({ message: 'Opening count is required' })
    }
    const count = await cashDrawerModel.confirm({
      drawerDeviceId: req.drawer.id,
      outletId: req.drawer.outletId,
      staffId: req.body.staffId || null,
      openingCount,
    })
    res.json(count)
  } catch (error) {
    next(error)
  }
})

module.exports = router
