const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { userModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  )
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }
    const user = await userModel.findByEmailWithPassword(email)
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated. Contact an admin.' })
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    const token = signToken(user)
    res.json({ token, user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' })
    }
    const existing = await userModel.findByEmail(email)
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' })
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await userModel.create({
      name,
      email,
      password: hashed,
      role: role || 'staff',
    })
    const token = signToken(user)
    res.status(201).json({ token, user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

module.exports = router
