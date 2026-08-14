const express = require('express')
const { itemModel, priceModel } = require('../models')
const { verifyToken, verifyAny } = require('../middlewares/auth')

const router = express.Router()

router.get('/:id/prices', verifyAny, async (req, res, next) => {
  try {
    const item = await itemModel.findById(req.params.id)
    if (!item) return res.status(404).json({ message: 'Item not found' })
    res.json({
      current: await priceModel.getCurrentPrice(req.params.id),
      history: await priceModel.listPrices(req.params.id),
    })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/prices', verifyToken, async (req, res, next) => {
  try {
    const item = await itemModel.findById(req.params.id)
    if (!item) return res.status(404).json({ message: 'Item not found' })
    const { costPrice, sellingPrice, effectiveFrom } = req.body
    if (costPrice === undefined || costPrice === null) {
      return res.status(400).json({ message: 'costPrice is required' })
    }
    res.status(201).json(
      await priceModel.setPrice(req.params.id, { costPrice, sellingPrice, effectiveFrom }),
    )
  } catch (error) {
    next(error)
  }
})

router.get('/', verifyAny, async (req, res, next) => {
  try {
    res.json(await itemModel.findAll())
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyAny, async (req, res, next) => {
  try {
    const item = await itemModel.findById(req.params.id)
    if (!item) return res.status(404).json({ message: 'Item not found' })
    res.json(item)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }
    const item = await itemModel.create(req.body)
    res.status(201).json(item)
  } catch (error) {
    next(error)
  }
})

router.post('/batch', verifyToken, async (req, res, next) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' })
    }
    const cleaned = items
      .map((i) => ({ name: (i.name || '').trim(), price: i.price, accountingGroup: i.accountingGroup }))
      .filter((i) => i.name)
    if (cleaned.length === 0) {
      return res.status(400).json({ message: 'At least one item name is required' })
    }
    res.status(201).json(await itemModel.createBatch(cleaned))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const item = await itemModel.update(req.params.id, req.body)
    if (!item) return res.status(404).json({ message: 'Item not found' })
    res.json(item)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const ok = await itemModel.remove(req.params.id)
    if (!ok) return res.status(404).json({ message: 'Item not found' })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

module.exports = router
