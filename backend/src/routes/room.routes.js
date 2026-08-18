const express = require('express')
const { roomModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await roomModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const room = await roomModel.findById(req.params.id)
    if (!room) return res.status(404).json({ message: 'Room not found' })
    res.json(room)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { roomNumber, roomTypeId } = req.body
    if (!roomNumber || !roomTypeId) return res.status(400).json({ message: 'Room number and type are required' })
    res.status(201).json(await roomModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { roomNumber, roomTypeId } = req.body
    if (!roomNumber || !roomTypeId) return res.status(400).json({ message: 'Room number and type are required' })
    res.json(await roomModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await roomModel.remove(req.params.id)
    res.json({ message: 'Room deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
