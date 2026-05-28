const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const prisma = require('../lib/prisma')

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt
  }
}

function signToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required')
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function setAuthCookie(res, token) {
  res.cookie('runfuel_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

function validationError(res, error) {
  return res.status(400).json({
    message: 'Invalid request',
    errors: error.flatten().fieldErrors
  })
}

async function register(req, res, next) {
  try {
    const result = credentialsSchema.safeParse(req.body)

    if (!result.success) {
      return validationError(res, result.error)
    }

    const email = result.data.email.toLowerCase()
    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' })
    }

    const passwordHash = await bcrypt.hash(result.data.password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        settings: { create: {} }
      },
      select: { id: true, email: true, createdAt: true }
    })

    const token = signToken(user.id)
    setAuthCookie(res, token)

    return res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
}

async function login(req, res, next) {
  try {
    const result = credentialsSchema.safeParse(req.body)

    if (!result.success) {
      return validationError(res, result.error)
    }

    const email = result.data.email.toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const passwordMatches = await bcrypt.compare(result.data.password, user.passwordHash)

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = signToken(user.id)
    setAuthCookie(res, token)

    return res.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
}

function me(req, res) {
  setAuthCookie(res, signToken(req.user.id))
  return res.json({ user: req.user })
}

function logout(req, res) {
  res.clearCookie('runfuel_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })

  return res.json({ message: 'Logged out' })
}

module.exports = { register, login, me, logout }
