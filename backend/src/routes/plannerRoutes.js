const express = require('express')
const { current, generate } = require('../controllers/plannerController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/current', requireAuth, current)
router.post('/generate', requireAuth, generate)
router.post('/regenerate', requireAuth, generate)

module.exports = router
