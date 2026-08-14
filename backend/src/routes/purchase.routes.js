const express = require('express')
const path = require('path')
const fs = require('fs')
const { purchaseModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')
const { attachmentUpload, deleteAttachmentFile } = require('../utils/upload')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { days } = req.query
    res.json(await purchaseModel.listPurchases({ days: days || undefined }))
  } catch (error) {
    next(error)
  }
})

router.get('/reports', verifyToken, async (req, res, next) => {
  try {
    const { days } = req.query
    res.json(await purchaseModel.purchaseReport({ days: days || undefined }))
  } catch (error) {
    next(error)
  }
})

router.get('/reports/supplier/:id', verifyToken, async (req, res, next) => {
  try {
    const { days } = req.query
    res.json(await purchaseModel.supplierPurchaseReport(req.params.id, { days: days || undefined }))
  } catch (error) {
    next(error)
  }
})

router.get('/reports/item/:id', verifyToken, async (req, res, next) => {
  try {
    const { days } = req.query
    res.json(await purchaseModel.itemPurchaseReport(req.params.id, { days: days || undefined }))
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { purchaseDate, poNumber, supplierId, staff, notes, locationId, items } = req.body
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
      await purchaseModel.createPurchase({
        purchaseDate,
        poNumber,
        supplierId: supplierId ? Number(supplierId) : null,
        staff,
        notes,
        locationId: Number(locationId),
        items: items.map((line) => ({ ...line, qty: Number(line.qty) })),
      }),
    )
  } catch (error) {
    next(error)
  }
})

router.put('/:id/send', verifyToken, async (req, res, next) => {
  try {
    const { email } = req.body
    res.json(await purchaseModel.sendPurchase(Number(req.params.id), { email }))
  } catch (error) {
    next(error)
  }
})

router.put(
  '/:id/receive',
  verifyToken,
  attachmentUpload.array('attachments', 5),
  async (req, res, next) => {
    try {
      let items = req.body.items
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items)
        } catch {
          return res.status(400).json({ message: 'Invalid items payload' })
        }
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'At least one received line is required' })
      }
      for (const line of items) {
        if (!line.itemId) {
          return res.status(400).json({ message: 'Each received line needs an item' })
        }
      }
      const attachments = (req.files || []).map((f) => ({
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
      }))
      try {
        res.json(
          await purchaseModel.receivePurchase(Number(req.params.id), {
            items,
            staff: req.body.staff,
            notes: req.body.notes,
            attachments,
          }),
        )
      } catch (error) {
        for (const f of attachments) deleteAttachmentFile(f.filename)
        next(error)
      }
    } catch (error) {
      next(error)
    }
  },
)

router.get('/:id/attachments/:fileId', verifyToken, async (req, res, next) => {
  try {
    const att = await purchaseModel.getAttachment(req.params.fileId)
    if (!att || att.purchase_id !== Number(req.params.id)) {
      return res.status(404).json({ message: 'Attachment not found' })
    }
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'receipts', path.basename(att.filename))
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on disk' })
    res.download(filePath, att.original_name)
  } catch (error) {
    next(error)
  }
})

module.exports = router
