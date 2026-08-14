const express = require('express')
const { clockModel, salePeriodModel, staffModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

// Staff currently clocked in for this device's outlet.
router.get('/active', verifyDevice, async (req, res, next) => {
  try {
    res.json(await clockModel.findActiveByOutlet(req.device.outletId))
  } catch (error) {
    next(error)
  }
})

// Clock in: staffId + PIN, or a staff QR code. Device comes from the token.
router.post('/clock-in', verifyDevice, async (req, res, next) => {
  try {
    const { staffId, pin, qrCode } = req.body
    let staff = null
    let method = 'pin'

    if (staffId) {
      staff = await staffModel.findByIdWithPin(Number(staffId))
    } else if (qrCode) {
      const found = await staffModel.findByQrCode(String(qrCode).trim())
      staff = found ? await staffModel.findByIdWithPin(found.id) : null
      method = 'qr'
    }

    if (!staff) return res.status(404).json({ message: 'Staff member not found' })
    if (!staff.is_active) return res.status(403).json({ message: 'Staff member is deactivated' })

    if (method === 'pin') {
      if (!pin) return res.status(400).json({ message: 'PIN is required' })
      const valid = await staffModel.verifyPin(staff, pin)
      if (!valid) return res.status(401).json({ message: 'Invalid PIN' })
    }

    // Workflow gate: staff only clock in during an open sales period for their outlet.
    const openPeriod = await salePeriodModel.findOpenByOutlet(req.device.outletId)
    if (!openPeriod) {
      return res
        .status(409)
        .json({ message: 'A sales period must be open before clocking in. A manager needs to open it first.' })
    }

    const event = await clockModel.clockIn({
      staffId: staff.id,
      deviceId: req.device.deviceId,
      method,
      openingCash: req.body.openingCash,
    })
    res.status(201).json(event)
  } catch (error) {
    next(error)
  }
})

// Clock out by clock event id. Optional closingCash counts the till; the
// response carries the reconciliation (expected vs actual variance).
router.post('/:id/clock-out', verifyDevice, async (req, res, next) => {
  try {
    res.json(
      await clockModel.clockOut(req.params.id, {
        notes: req.body?.notes,
        closingCash: req.body?.closingCash,
      }),
    )
  } catch (error) {
    next(error)
  }
})

module.exports = router
