const express = require('express')
const { housekeepingTaskModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await housekeepingTaskModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { roomId } = req.body
    if (!roomId) return res.status(400).json({ message: 'Room is required' })
    res.status(201).json(await housekeepingTaskModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { roomId } = req.body
    if (!roomId) return res.status(400).json({ message: 'Room is required' })
    res.json(await housekeepingTaskModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await housekeepingTaskModel.remove(req.params.id)
    res.json({ message: 'Housekeeping task deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
