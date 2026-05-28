const { z } = require('zod')
const prisma = require('../lib/prisma')

const weightEntrySchema = z.object({
  date: z.string().date(),
  weightKg: z.coerce.number().positive()
})

function validationError(res, error) {
  return res.status(400).json({
    message: 'Invalid request',
    errors: error.flatten().fieldErrors
  })
}

function dateOnlyUtc(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`)
}

function serializeWeightEntry(entry) {
  if (!entry) {
    return null
  }

  return {
    id: entry.id,
    date: entry.date.toISOString().slice(0, 10),
    weightKg: entry.weightKg
  }
}

async function getLatestWeight(req, res, next) {
  try {
    const entry = await prisma.weightEntry.findFirst({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' }
    })

    return res.json({ weightEntry: serializeWeightEntry(entry) })
  } catch (error) {
    next(error)
  }
}

async function getWeightEntries(req, res, next) {
  try {
    const entries = await prisma.weightEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30
    })

    return res.json({ weightEntries: entries.map(serializeWeightEntry) })
  } catch (error) {
    next(error)
  }
}

async function createWeightEntry(req, res, next) {
  try {
    const result = weightEntrySchema.safeParse(req.body)

    if (!result.success) {
      return validationError(res, result.error)
    }

    const entry = await prisma.weightEntry.create({
      data: {
        userId: req.user.id,
        date: dateOnlyUtc(result.data.date),
        weightKg: result.data.weightKg
      }
    })

    return res.status(201).json({ weightEntry: serializeWeightEntry(entry) })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A weight entry already exists for this date' })
    }

    next(error)
  }
}

module.exports = { getLatestWeight, getWeightEntries, createWeightEntry }
