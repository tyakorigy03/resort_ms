const express = require('express')
const { recipeModel } = require('../models')
const { verifyToken } = require('../middlewares/auth')

const router = express.Router()

router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json(await recipeModel.listRecipes())
  } catch (error) {
    next(error)
  }
})

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    res.json(await recipeModel.fetchRecipe(Number(req.params.id)))
  } catch (error) {
    next(error)
  }
})

router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { description, type, outputItemId, outputQty, outputUnit, notes, ingredients } = req.body
    res.status(201).json(
      await recipeModel.createRecipe({
        description,
        type,
        outputItemId: outputItemId ? Number(outputItemId) : null,
        outputQty,
        outputUnit,
        notes,
        ingredients: Array.isArray(ingredients) ? ingredients : [],
      }),
    )
  } catch (error) {
    next(error)
  }
})

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { description, type, outputItemId, outputQty, outputUnit, notes, ingredients } = req.body
    res.json(
      await recipeModel.updateRecipe(Number(req.params.id), {
        description,
        type,
        outputItemId: outputItemId ? Number(outputItemId) : null,
        outputQty,
        outputUnit,
        notes,
        ingredients: Array.isArray(ingredients) ? ingredients : [],
      }),
    )
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    await recipeModel.deleteRecipe(Number(req.params.id))
    res.json({ message: 'Recipe deleted' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
