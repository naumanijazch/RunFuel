const express = require('express')
const { createWeightEntry, getLatestWeight, getWeightEntries } = require('../controllers/weightController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/latest', requireAuth, getLatestWeight)
router.get('/', requireAuth, getWeightEntries)
router.post('/', requireAuth, createWeightEntry)

module.exports = router
