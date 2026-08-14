const express = require('express')
const { locationModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await locationModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Location name is required' })
    }
    res.status(201).json(await locationModel.create({ name: name.trim(), description }))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Location name is required' })
    }
    res.json(await locationModel.update(Number(req.params.id), { name: name.trim(), description }))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    res.json(await locationModel.remove(Number(req.params.id)))
  } catch (error) {
    next(error)
  }
})

module.exports = router
