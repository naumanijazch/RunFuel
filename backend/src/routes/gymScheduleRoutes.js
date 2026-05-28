const express = require('express')
const { getGymSchedule, updateGymSchedule } = require('../controllers/gymScheduleController')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/', requireAuth, getGymSchedule)
router.put('/', requireAuth, updateGymSchedule)

module.exports = router
