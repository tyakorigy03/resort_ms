const express = require('express')
const { modifierGroupModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await modifierGroupModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const group = await modifierGroupModel.findById(req.params.id)
    if (!group) return res.status(404).json({ message: 'Modifier group not found' })
    res.json(group)
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
    res.status(201).json(await modifierGroupModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const group = await modifierGroupModel.update(req.params.id, req.body)
    if (!group) return res.status(404).json({ message: 'Modifier group not found' })
    res.json(group)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await modifierGroupModel.remove(req.params.id)
    res.json({ message: 'Modifier group deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
