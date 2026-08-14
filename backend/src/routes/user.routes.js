const express = require('express')
const bcrypt = require('bcryptjs')
const { userModel } = require('../models')
const { verifyToken, requireAdmin } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { includeInactive } = req.query
    res.json(await userModel.findAll({ includeInactive: includeInactive === 'true' }))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' })
    }
    const existing = await userModel.findByEmail(email)
    if (existing) return res.status(409).json({ message: 'Email already registered' })
    const hashed = await bcrypt.hash(password, 10)
    res.status(201).json(await userModel.create({ name, email, password: hashed, role }))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body
    const existing = await userModel.findById(req.params.id)
    if (!existing) return res.status(404).json({ message: 'User not found' })
    const dup = await userModel.findByEmail(email)
    if (dup && dup.id !== existing.id) return res.status(409).json({ message: 'Email already registered' })
    const updated = await userModel.update(existing.id, {
      name,
      email,
      role,
      isActive,
    })
    res.json(updated)
  } catch (error) {
    next(error)
  }
})

router.put('/:id/password', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ message: 'Password is required' })
    const hashed = await bcrypt.hash(password, 10)
    const user = await userModel.setPassword(req.params.id, hashed)
    res.json({ user })
  } catch (error) {
    next(error)
  }
})

module.exports = router
