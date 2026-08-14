const express = require('express')
const { wastageModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { days } = req.query
    res.json(await wastageModel.listWastages({ days: days || undefined }))
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { date, staff, notes, locationId, items } = req.body
    if (!staff || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Staff and at least one item are required' })
    }
    if (!locationId) {
      return res.status(400).json({ message: 'A location is required' })
    }
    for (const line of items) {
      if (!line.itemId || line.qty === undefined || line.qty === null || Number(line.qty) <= 0) {
        return res.status(400).json({ message: 'Each item needs an item and a positive quantity' })
      }
    }
    res.status(201).json(
      await wastageModel.createWastage({
        date,
        staff,
        notes,
        locationId,
        items: items.map((line) => ({ ...line, qty: Number(line.qty) })),
      }),
    )
  } catch (error) {
    next(error)
  }
})

module.exports = router
