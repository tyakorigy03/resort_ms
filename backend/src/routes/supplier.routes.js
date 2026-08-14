const express = require('express')
const { supplierModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await supplierModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const supplier = await supplierModel.findById(req.params.id)
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' })
    res.json(supplier)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.status(201).json(await supplierModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.json(await supplierModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await supplierModel.remove(req.params.id)
    res.json({ message: 'Supplier deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
