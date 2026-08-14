const express = require('express')
const bcrypt = require('bcryptjs')
const { staffModel, userModel } = require('../models')
const { verifyToken, verifyAny } = require('../middlewares/auth')

const router = express.Router()

// Active staff (minimal fields) for POS clock-in screens — accepts user or device tokens.
router.get('/active', verifyAny, async (req, res, next) => {
  try {
    res.json(await staffModel.findActiveMinimal())
  } catch (error) {
    next(error)
  }
})

// Staff roles for the backoffice (role assignment dropdown).
router.get('/roles', verifyToken, async (req, res, next) => {
  try {
    res.json(await staffModel.listRoles())
  } catch (error) {
    next(error)
  }
})

// Staff who may open/close a sales period (device or user token). Used by the
// POS to let a manager authorize period open/close.
router.get('/managers', verifyAny, async (req, res, next) => {
  try {
    res.json(await staffModel.findManagers('sale_period.open'))
  } catch (error) {
    next(error)
  }
})

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await staffModel.findAll({ activeOnly: req.query.active === 'true' }))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const staff = await staffModel.findById(req.params.id)
    if (!staff) return res.status(404).json({ message: 'Staff member not found' })
    res.json(staff)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body
    if (!firstName || !lastName) return res.status(400).json({ message: 'First and last name are required' })
    res.status(201).json(await staffModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body
    if (!firstName || !lastName) return res.status(400).json({ message: 'First and last name are required' })
    res.json(await staffModel.update(req.params.id, req.body))
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
    await staffModel.setPin(req.params.id, String(pin))
    res.json({ message: 'Staff PIN set' })
  } catch (error) {
    next(error)
  }
})

router.get('/:id/qr', verifyToken, async (req, res, next) => {
  try {
    const qrCode = await staffModel.getQrCode(req.params.id)
    res.json({ qrCode })
  } catch (error) {
    next(error)
  }
})

// Link an existing user account to a staff member (1:1).
router.post('/:id/link-user', verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ message: 'userId is required' })
    res.json(await staffModel.linkUser(req.params.id, userId))
  } catch (error) {
    next(error)
  }
})

// Remove the link between a staff member and their user account.
router.delete('/:id/link-user', verifyToken, async (req, res, next) => {
  try {
    res.json(await staffModel.unlinkUser(req.params.id))
  } catch (error) {
    next(error)
  }
})

// Create a user account for a staff member (using their name) and link it.
router.post('/:id/user', verifyToken, async (req, res, next) => {
  try {
    const { email, password, role } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })
    const staff = await staffModel.findById(req.params.id)
    if (!staff) return res.status(404).json({ message: 'Staff member not found' })
    if (staff.userId) return res.status(409).json({ message: 'Staff member already has a linked user account' })
    if (await userModel.findByEmail(email)) return res.status(409).json({ message: 'Email is already registered' })
    const hashed = await bcrypt.hash(String(password), 10)
    const user = await userModel.create({ name: staff.name, email, password: hashed, role })
    const linkedStaff = await staffModel.linkUser(staff.id, user.id)
    res.status(201).json({ user, staff: linkedStaff })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await staffModel.remove(req.params.id)
    res.json({ message: 'Staff member deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
