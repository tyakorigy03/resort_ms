const express = require('express')
const { reservationModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/dashboard', verifyToken, async (req, res, next) => {
  try {
    res.json(await reservationModel.dashboardCounts())
  } catch (error) {
    next(error)
  }
})

router.get('/available-rooms', verifyToken, async (req, res, next) => {
  try {
    const { checkInDate, checkOutDate, roomTypeId } = req.query
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'checkInDate and checkOutDate are required' })
    }
    res.json(await reservationModel.availableRooms({ checkInDate, checkOutDate, roomTypeId }))
  } catch (error) {
    next(error)
  }
})

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { status, checkInDate, checkOutDate, search, limit } = req.query
    res.json(await reservationModel.findAll({ status, checkInDate, checkOutDate, search, limit }))
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    res.status(201).json(await reservationModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.post('/:id/check-in', verifyToken, async (req, res, next) => {
  try {
    res.json(await reservationModel.checkIn(req.params.id, req.body.roomId))
  } catch (error) {
    next(error)
  }
})

router.post('/:id/check-out', verifyToken, async (req, res, next) => {
  try {
    res.json(await reservationModel.checkOut(req.params.id, { forceReason: req.body.forceReason }))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const reservation = await reservationModel.findById(req.params.id)
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' })
    res.json(reservation)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    res.json(await reservationModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    res.json(await reservationModel.remove(req.params.id))
  } catch (error) {
    next(error)
  }
})

module.exports = router
