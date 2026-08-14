const express = require('express')
const { comboModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await comboModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const combo = await comboModel.findById(req.params.id)
    if (!combo) return res.status(404).json({ message: 'Combo not found' })
    res.json(combo)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' })
    }
    res.status(201).json(await comboModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const combo = await comboModel.update(req.params.id, req.body)
    if (!combo) return res.status(404).json({ message: 'Combo not found' })
    res.json(combo)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await comboModel.remove(req.params.id)
    res.json({ message: 'Combo deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
