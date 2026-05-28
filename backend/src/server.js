const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)

app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'RunFuel API is running!' })
})

const PORT = process.env.PORT || 5001

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
