const express = require('express')
const { menuModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await menuModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const menu = await menuModel.findById(req.params.id)
    if (!menu) return res.status(404).json({ message: 'Menu not found' })
    res.json(menu)
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
    const menu = await menuModel.create(req.body)
    res.status(201).json(menu)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const menu = await menuModel.update(req.params.id, req.body)
    if (!menu) return res.status(404).json({ message: 'Menu not found' })
    res.json(menu)
  } catch (error) {
    next(error)
  }
})

router.patch('/:id/active', verifyToken, async (req, res, next) => {
  try {
    const menu = await menuModel.setActive(req.params.id, Boolean(req.body.isActive))
    if (!menu) return res.status(404).json({ message: 'Menu not found' })
    res.json(menu)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await menuModel.remove(req.params.id)
    res.json({ message: 'Menu deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
