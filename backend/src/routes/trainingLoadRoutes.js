const express = require('express')
const { analyzePlan, getAnalysis } = require('../controllers/trainingLoadController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/analysis', requireAuth, getAnalysis)
router.post('/analyze-plan', requireAuth, analyzePlan)

module.exports = router
