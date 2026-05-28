const express = require('express')
const { login, logout, me, register } = require('../controllers/authController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)

// Protected routes
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)

module.exports = router
