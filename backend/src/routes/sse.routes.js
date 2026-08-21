const express = require('express')
const sse = require('../utils/sse')
const { verifyToken, verifyDevice } = require('../middlewares/auth')
const jwt = require('jsonwebtoken')

const router = express.Router()

function extractToken(req) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7)
  return req.query.token || null
}

router.get('/pos-orders', (req, res, next) => {
  const token = extractToken(req)
  if (!token) return res.status(401).json({ message: 'Token required' })
  try {
    jwt.verify(token, process.env.JWT_SECRET)
    sse.addClient(res)
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
})

module.exports = router
