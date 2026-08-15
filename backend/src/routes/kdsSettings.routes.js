const express = require('express')
const { kdsSettingsModel } = require('../models')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

function requireStation(req, res, next) {
  if (!req.device.productionCenterId) {
    return res.status(409).json({ message: 'This device has no kitchen station assigned. Pair it in the backoffice.' })
  }
  next()
}

// This station's KDS settings (merged with defaults when never saved).
router.get('/', verifyDevice, requireStation, async (req, res, next) => {
  try {
    res.json(await kdsSettingsModel.getByStation(req.device.productionCenterId))
  } catch (error) {
    next(error)
  }
})

router.put('/', verifyDevice, requireStation, async (req, res, next) => {
  try {
    res.json(await kdsSettingsModel.upsert(req.device.productionCenterId, req.body))
  } catch (error) {
    next(error)
  }
})

module.exports = router
