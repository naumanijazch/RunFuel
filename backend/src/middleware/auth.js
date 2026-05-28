const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

function getToken(req) {
  const header = req.headers.authorization

  if (header && header.startsWith('Bearer ')) {
    return header.slice(7)
  }

  return null
}

async function requireAuth(req, res, next) {
  try {
    const token = getToken(req)

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, createdAt: true }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid session' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid session' })
  }
}

module.exports = { requireAuth }
