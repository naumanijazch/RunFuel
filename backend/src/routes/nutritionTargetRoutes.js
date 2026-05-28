const express = require('express')
const {
  getCurrentNutritionTarget,
  upsertNutritionTarget
} = require('../controllers/nutritionTargetController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/current', requireAuth, getCurrentNutritionTarget)
router.post('/', requireAuth, upsertNutritionTarget)

module.exports = router
