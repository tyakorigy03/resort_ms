const express = require('express')
const jwt = require('jsonwebtoken')
const { deviceModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

function signDeviceToken(device) {
  return jwt.sign(
    {
      deviceId: device.id,
      code: device.code,
      deviceType: device.deviceType,
      outletId: device.outletId,
      productionCenterId: device.productionCenterId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.DEVICE_TOKEN_EXPIRES_IN || '12h' },
  )
}

// POS device login: device code only. Public endpoint used by the restaurant app.
router.post('/authenticate', async (req, res, next) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ message: 'Device code is required' })
    }
    const device = await deviceModel.findByCode(String(code).trim().toUpperCase())
    if (!device) {
      return res.status(401).json({ message: 'Invalid device credentials' })
    }
    if (!device.isActive) {
      return res.status(403).json({ message: 'Device is deactivated. Contact an admin.' })
    }
    const token = signDeviceToken(device)
    const detail = await deviceModel.findById(device.id)
    res.json({ token, device: detail })
  } catch (error) {
    next(error)
  }
})

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await deviceModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.status(201).json(await deviceModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.json(await deviceModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id/pin', verifyToken, async (req, res, next) => {
  try {
    const { pin } = req.body
    if (!pin) return res.status(400).json({ message: 'PIN is required' })
    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ message: 'PIN must be exactly 4 digits' })
    }
    await deviceModel.setPin(req.params.id, String(pin))
    res.json({ message: 'Device PIN set' })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await deviceModel.remove(req.params.id)
    res.json({ message: 'Device deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
