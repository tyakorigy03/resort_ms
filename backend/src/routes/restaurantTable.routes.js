const express = require('express')
const { restaurantTableModel, floorPlanModel } = require('../models')
const { verifyToken, verifyAny } = require('../middlewares/auth')

const router = express.Router()

// Tables of a floor plan. Devices may only read plans of their own outlet.
router.get('/', verifyAny, async (req, res, next) => {
  try {
    if (!req.query.floorPlanId) return res.status(400).json({ message: 'floorPlanId is required' })
    if (req.device) {
      const plan = await floorPlanModel.findById(req.query.floorPlanId)
      if (!plan || plan.outletId !== req.device.outletId) {
        return res.status(404).json({ message: 'Floor plan not found' })
      }
    }
    res.json(await restaurantTableModel.findByFloorPlan(req.query.floorPlanId))
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { floorPlanId, seats } = req.body
    if (!floorPlanId) return res.status(400).json({ message: 'floorPlanId is required' })
    if (!seats || Number(seats) < 1) return res.status(400).json({ message: 'Seats must be at least 1' })
    res.status(201).json(await restaurantTableModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    res.json(await restaurantTableModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await restaurantTableModel.remove(req.params.id)
    res.json({ message: 'Table deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
