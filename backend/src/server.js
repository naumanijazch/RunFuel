const express = require('express')
const cors = require('cors')
require('dotenv').config()
const authRoutes = require('./routes/authRoutes')
const gymScheduleRoutes = require('./routes/gymScheduleRoutes')
const nutritionTargetRoutes = require('./routes/nutritionTargetRoutes')
const settingsRoutes = require('./routes/settingsRoutes')
const weightRoutes = require('./routes/weightRoutes')

const app = express()

app.set('etag', false) // prevent caching

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)

app.use(express.json())

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.get('/', (req, res) => {
  res.json({ message: 'RunFuel API is running!' })
})

app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/gym-schedule', gymScheduleRoutes)
app.use('/api/nutrition-target', nutritionTargetRoutes)
app.use('/api/weight', weightRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Something went wrong' })
})

const PORT = process.env.PORT || 5001

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
