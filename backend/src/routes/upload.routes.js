const express = require('express')
const { upload } = require('../utils/upload')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.post('/', verifyToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' })
  res.status(201).json({ url: `/uploads/${req.file.filename}` })
})

module.exports = router
