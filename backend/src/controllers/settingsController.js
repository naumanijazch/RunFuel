const { z } = require('zod')
const prisma = require('../lib/prisma')

const API_TO_PRISMA = {
  weightUnit: { kg: 'KG', lbs: 'LBS' },
  distanceUnit: { km: 'KM', miles: 'MILES' },
  paceUnit: { min_per_km: 'MIN_PER_KM', min_per_mile: 'MIN_PER_MILE' },
  goalType: {
    '5k': 'FIVE_K',
    '10k': 'TEN_K',
    general_endurance: 'GENERAL_ENDURANCE',
    hybrid_conditioning: 'HYBRID_CONDITIONING'
  }
}

const PRISMA_TO_API = {
  weightUnit: Object.fromEntries(Object.entries(API_TO_PRISMA.weightUnit).map(([key, value]) => [value, key])),
  distanceUnit: Object.fromEntries(
    Object.entries(API_TO_PRISMA.distanceUnit).map(([key, value]) => [value, key])
  ),
  paceUnit: Object.fromEntries(Object.entries(API_TO_PRISMA.paceUnit).map(([key, value]) => [value, key])),
  goalType: Object.fromEntries(Object.entries(API_TO_PRISMA.goalType).map(([key, value]) => [value, key]))
}

const settingsSchema = z.object({
  weightUnit: z.enum(['kg', 'lbs']),
  distanceUnit: z.enum(['km', 'miles']),
  paceUnit: z.enum(['min_per_km', 'min_per_mile']),
  easyPaceSecPerKm: z.coerce.number().int().positive().nullable().optional(),
  goalType: z.enum(['5k', '10k', 'general_endurance', 'hybrid_conditioning'])
})

function validationError(res, error) {
  return res.status(400).json({
    message: 'Invalid request',
    errors: error.flatten().fieldErrors
  })
}

function serializeSettings(settings) {
  return {
    weightUnit: PRISMA_TO_API.weightUnit[settings.weightUnit],
    distanceUnit: PRISMA_TO_API.distanceUnit[settings.distanceUnit],
    paceUnit: PRISMA_TO_API.paceUnit[settings.paceUnit],
    easyPaceSecPerKm: settings.easyPaceSecPerKm,
    goalType: PRISMA_TO_API.goalType[settings.goalType]
  }
}

async function getOrCreateSettings(userId) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId }
  })
}

async function getSettings(req, res, next) {
  try {
    const settings = await getOrCreateSettings(req.user.id)
    return res.json({ settings: serializeSettings(settings) })
  } catch (error) {
    next(error)
  }
}

async function updateSettings(req, res, next) {
  try {
    const result = settingsSchema.safeParse(req.body)

    if (!result.success) {
      return validationError(res, result.error)
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        weightUnit: API_TO_PRISMA.weightUnit[result.data.weightUnit],
        distanceUnit: API_TO_PRISMA.distanceUnit[result.data.distanceUnit],
        paceUnit: API_TO_PRISMA.paceUnit[result.data.paceUnit],
        easyPaceSecPerKm: result.data.easyPaceSecPerKm ?? null,
        goalType: API_TO_PRISMA.goalType[result.data.goalType]
      },
      update: {
        weightUnit: API_TO_PRISMA.weightUnit[result.data.weightUnit],
        distanceUnit: API_TO_PRISMA.distanceUnit[result.data.distanceUnit],
        paceUnit: API_TO_PRISMA.paceUnit[result.data.paceUnit],
        easyPaceSecPerKm: result.data.easyPaceSecPerKm ?? null,
        goalType: API_TO_PRISMA.goalType[result.data.goalType]
      }
    })

    return res.json({ settings: serializeSettings(settings) })
  } catch (error) {
    next(error)
  }
}

module.exports = { getSettings, updateSettings }
