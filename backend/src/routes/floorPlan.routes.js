const express = require('express')
const { floorPlanModel } = require('../models')
const { verifyToken, verifyAny } = require('../middlewares/auth')

const router = express.Router()

// List floor plans. Backoffice can read all; POS devices read their outlet's.
router.get('/', verifyAny, async (req, res, next) => {
  try {
    if (req.user) {
      return res.json(await floorPlanModel.findAll())
    }
    return res.json(await floorPlanModel.findByOutlet(req.device.outletId))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyAny, async (req, res, next) => {
  try {
    const plan = await floorPlanModel.findById(req.params.id)
    if (!plan) return res.status(404).json({ message: 'Floor plan not found' })
    if (req.device && plan.outletId !== req.device.outletId) {
      return res.status(404).json({ message: 'Floor plan not found' })
    }
    res.json(plan)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { outletId, name } = req.body
    if (!outletId || !name) return res.status(400).json({ message: 'Outlet and name are required' })
    res.status(201).json(await floorPlanModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    res.json(await floorPlanModel.update(req.params.id, req.body))
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await floorPlanModel.remove(req.params.id)
    res.json({ message: 'Floor plan deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
