const express = require('express')
const { tableSessionModel, restaurantTableModel, floorPlanModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

// Active table sessions for this device's outlet (used by the Tables screen).
router.get('/active', verifyDevice, async (req, res, next) => {
  try {
    res.json(await tableSessionModel.listActiveByOutlet(req.device.outletId))
  } catch (error) {
    next(error)
  }
})

// Open a table session (seat a table). The table must belong to this outlet.
router.post('/open', verifyDevice, async (req, res, next) => {
  try {
    const { tableId, covers } = req.body
    if (!tableId) return res.status(400).json({ message: 'tableId is required' })
    const table = await restaurantTableModel.findById(tableId)
    if (!table) return res.status(404).json({ message: 'Table not found' })
    const plan = await floorPlanModel.findById(table.floorPlanId)
    if (!plan || plan.outletId !== req.device.outletId) {
      return res.status(404).json({ message: 'Table not found in this outlet' })
    }
    res.status(201).json(
      await tableSessionModel.open({
        tableId,
        outletId: req.device.outletId,
        openedByStaffId: req.body.staffId || null,
        openedOnDeviceId: req.device.deviceId,
        covers,
      }),
    )
  } catch (error) {
    next(error)
  }
})

// Close a table session. Blocks while an open order exists.
router.post('/:id/close', verifyDevice, async (req, res, next) => {
  try {
    res.json(await tableSessionModel.close(req.params.id))
  } catch (error) {
    next(error)
  }
})

module.exports = router
