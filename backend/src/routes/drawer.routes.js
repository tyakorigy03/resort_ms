const express = require('express')
const drawerDriver = require('../drivers/drawer')
const { verifyDevice } = require('../middlewares/auth')

const router = express.Router()

// "No sale": pop the cash drawer without recording a sale.
router.post('/open', verifyDevice, async (req, res) => {
  res.json(await drawerDriver.open())
})

module.exports = router
