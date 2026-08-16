const express = require('express')
const { folioModel } = require('../models')
const { verifyToken, verifyAny } = require('../middlewares/auth')

const router = express.Router()

router.get('/search', verifyAny, async (req, res, next) => {
  try {
    const { roomNumber, guestName } = req.query
    if (!roomNumber && !guestName) {
      return res.status(400).json({ message: 'roomNumber or guestName is required' })
    }
    res.json(await folioModel.search({ roomNumber, guestName }))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const folio = await folioModel.findById(req.params.id)
    if (!folio) return res.status(404).json({ message: 'Folio not found' })
    res.json(folio)
  } catch (error) {
    next(error)
  }
})

router.post('/:id/lines', verifyToken, async (req, res, next) => {
  try {
    const { type, description, amount } = req.body
    if (!type || amount === undefined) {
      return res.status(400).json({ message: 'type and amount are required' })
    }
    res.status(201).json(await folioModel.addLine(req.params.id, {
      type,
      description,
      amount,
    }))
  } catch (error) {
    next(error)
  }
})

router.post('/:id/room-charges', verifyToken, async (req, res, next) => {
  try {
    const { nights, rate, description } = req.body
    res.status(201).json(await folioModel.postRoomCharges(req.params.id, { nights, rate, description }))
  } catch (error) {
    next(error)
  }
})

module.exports = router
