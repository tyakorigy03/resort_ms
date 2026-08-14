const express = require('express')
const { modifierModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const groupId = req.query.group_id ? Number(req.query.group_id) : undefined
    res.json(await modifierModel.findAll({ groupId }))
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const modifier = await modifierModel.findById(req.params.id)
    if (!modifier) return res.status(404).json({ message: 'Modifier not found' })
    res.json(modifier)
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { name, modifierGroupId } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' })
    }
    if (!modifierGroupId) {
      return res.status(400).json({ message: 'modifierGroupId is required' })
    }
    res.status(201).json(await modifierModel.create(req.body))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const modifier = await modifierModel.update(req.params.id, req.body)
    if (!modifier) return res.status(404).json({ message: 'Modifier not found' })
    res.json(modifier)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await modifierModel.remove(req.params.id)
    res.json({ message: 'Modifier deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
