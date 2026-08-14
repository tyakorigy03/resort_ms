const express = require('express')
const { taxProfileModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await taxProfileModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.status(201).json(await taxProfileModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.json(await taxProfileModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await taxProfileModel.remove(req.params.id)
    res.json({ message: 'Tax profile deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
