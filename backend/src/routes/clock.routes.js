const express = require('express')
const { clockModel, salePeriodModel, staffModel, deviceModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

// Load a clock event scoped to this device's outlet (events clocked on another
// outlet's device are invisible).
async function loadShift(id, outletId) {
  const event = await clockModel.findById(id)
  if (!event) return null
  if (event.deviceId) {
    const device = await deviceModel.findById(event.deviceId)
    if (!device || device.outletId !== outletId) return null
  }
  return event
}

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

// Shift summary (till reconciliation + sales + elapsed time) for the
// clock-out flow. Does not close the shift.
router.get('/:id', verifyDevice, async (req, res, next) => {
  try {
    const event = await loadShift(req.params.id, req.device.outletId)
    if (!event) return res.status(404).json({ message: 'Shift not found' })
    res.json(await clockModel.summaryFor(event))
  } catch (error) {
    next(error)
  }
})

// Clock out by clock event id. Requires the closing cash count and the staff
// member's PIN as a sign-off; the response carries the reconciliation
// (expected vs actual variance).
router.post('/:id/clock-out', verifyDevice, async (req, res, next) => {
  try {
    const event = await loadShift(req.params.id, req.device.outletId)
    if (!event) return res.status(404).json({ message: 'Shift not found' })

    const { pin, closingCash } = req.body || {}
    const staff = await staffModel.findByIdWithPin(event.staffId)
    if (!staff || !staff.is_active) return res.status(403).json({ message: 'Staff member not found or deactivated' })
    const valid = await staffModel.verifyPin(staff, pin)
    if (!valid) return res.status(401).json({ message: 'Invalid PIN' })

    if (closingCash === undefined || closingCash === null || Number(closingCash) < 0) {
      return res.status(400).json({ message: 'Closing cash count is required' })
    }

    res.json(
      await clockModel.clockOut(req.params.id, {
        notes: req.body?.notes,
        closingCash: Number(closingCash),
      }),
    )
  } catch (error) {
    next(error)
  }
})

module.exports = router
