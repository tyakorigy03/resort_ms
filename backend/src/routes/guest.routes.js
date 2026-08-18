const express = require('express')
const guestModel = require('../models/guest.model')

const router = express.Router()

router.post('/lookup', async (req, res, next) => {
  try {
    const { roomNumber } = req.body
    const reservation = await guestModel.lookupByRoom(roomNumber)
    res.json({ reservation })
  } catch (err) {
    next(err)
  }
})

router.post('/request-otp', async (req, res, next) => {
  try {
    const { reservationId } = req.body
    if (!reservationId) return res.status(400).json({ message: 'reservationId is required' })
    const result = await guestModel.requestOtp(reservationId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { reservationId, code } = req.body
    if (!reservationId || !code) return res.status(400).json({ message: 'reservationId and code are required' })
    const result = await guestModel.verifyOtp(reservationId, code)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.get('/dashboard/:reservationId', async (req, res, next) => {
  try {
    const dashboard = await guestModel.guestDashboard(Number(req.params.reservationId))
    res.json(dashboard)
  } catch (err) {
    next(err)
  }
})

module.exports = router
