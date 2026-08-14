const express = require('express')
const { priceListModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await priceListModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.status(201).json(await priceListModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.get('/:id/items', verifyToken, async (req, res, next) => {
  try {
    res.json(await priceListModel.listItemsWithPrices(req.params.id))
  } catch (error) {
    next(error)
  }
})

router.put('/:id/items', verifyToken, async (req, res, next) => {
  try {
    const { prices } = req.body
    if (!Array.isArray(prices)) {
      return res.status(400).json({ message: 'prices array is required' })
    }
    await priceListModel.setListPrices(req.params.id, prices)
    res.json(await priceListModel.listItemsWithPrices(req.params.id))
  } catch (error) {
    next(error)
  }
})

router.put('/:id/default', verifyToken, async (req, res, next) => {
  try {
    res.json(await priceListModel.setDefault(req.params.id))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    res.json(await priceListModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await priceListModel.remove(req.params.id)
    res.json({ message: 'Price list deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
