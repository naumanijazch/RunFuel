const express = require('express')
const { callback, connect, runs, status, summary, sync } = require('../controllers/stravaController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/connect', requireAuth, connect)
router.get('/callback', callback)
router.get('/status', requireAuth, status)
router.post('/sync', requireAuth, sync)
router.get('/runs', requireAuth, runs)
router.get('/summary', requireAuth, summary)

module.exports = router
