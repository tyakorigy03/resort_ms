const express = require('express')
const router = express.Router()
const reportModel = require('../models/report.model')
const { verifyToken } = require('../middlewares/auth')

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.executiveDashboard()
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/revenue-trend', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.revenueTrend(req.query.days)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/sales/daily', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.salesDaily(req.query.start, req.query.end, req.query.outletId)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/sales/by-item', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.salesByItem(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/sales/by-outlet', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.salesByOutlet(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/sales/by-staff', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.salesByStaff(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/sales/hourly', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.salesByHour(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/inventory/stock-summary', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.stockSummary()
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/inventory/wastage', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.wastageSummary(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/inventory/movements', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.stockMovements(req.query.start, req.query.end, req.query.itemId)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/occupancy', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.occupancyReport(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/occupancy/revenue', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.roomRevenue(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/staff/shift-summary', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.staffShiftSummary(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/menu/performance', verifyToken, async (req, res) => {
  try {
    const result = await reportModel.menuPerformance(req.query.start, req.query.end)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
