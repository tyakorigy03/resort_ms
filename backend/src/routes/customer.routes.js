const express = require('express')
const { customerModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await customerModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body
    if (!firstName || !lastName) return res.status(400).json({ message: 'First and last name are required' })
    res.status(201).json(await customerModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body
    if (!firstName || !lastName) return res.status(400).json({ message: 'First and last name are required' })
    res.json(await customerModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await customerModel.remove(req.params.id)
    res.json({ message: 'Customer deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
