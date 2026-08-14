const express = require('express')
const { stockLevelModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { locationId } = req.query
    res.json(await stockLevelModel.listStockLevels({ locationId: locationId || undefined }))
  } catch (error) {
    next(error)
  }
})

module.exports = router
