const { z } = require('zod')
const prisma = require('../lib/prisma')

const nutritionTargetSchema = z.object({
  weekStartDate: z.string().date().optional(),
  calories: z.coerce.number().int().positive(),
  proteinG: z.coerce.number().int().nonnegative(),
  carbsG: z.coerce.number().int().nonnegative().nullable().optional(),
  fatG: z.coerce.number().int().nonnegative().nullable().optional()
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

function isoWeekStartUtc(date) {
  const weekStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = weekStart.getUTCDay() || 7
  weekStart.setUTCDate(weekStart.getUTCDate() - day + 1)
  return weekStart
}

function currentWeekStartDate() {
  return isoWeekStartUtc(new Date())
}

function serializeNutritionTarget(target) {
  if (!target) {
    return null
  }

  return {
    weekStartDate: target.weekStartDate.toISOString().slice(0, 10),
    calories: target.calories,
    proteinG: target.proteinG,
    carbsG: target.carbsG,
    fatG: target.fatG
  }
}

async function getCurrentNutritionTarget(req, res, next) {
  try {
    const target = await prisma.nutritionTarget.findUnique({
      where: {
        userId_weekStartDate: {
          userId: req.user.id,
          weekStartDate: currentWeekStartDate()
        }
      }
    })

    return res.json({ nutritionTarget: serializeNutritionTarget(target) })
  } catch (error) {
    next(error)
  }
}

async function upsertNutritionTarget(req, res, next) {
  try {
    const result = nutritionTargetSchema.safeParse(req.body)

    if (!result.success) {
      return validationError(res, result.error)
    }

    const weekStartDate = result.data.weekStartDate
      ? isoWeekStartUtc(dateOnlyUtc(result.data.weekStartDate))
      : currentWeekStartDate()

    const target = await prisma.nutritionTarget.upsert({
      where: {
        userId_weekStartDate: {
          userId: req.user.id,
          weekStartDate
        }
      },
      create: {
        userId: req.user.id,
        weekStartDate,
        calories: result.data.calories,
        proteinG: result.data.proteinG,
        carbsG: result.data.carbsG ?? null,
        fatG: result.data.fatG ?? null
      },
      update: {
        calories: result.data.calories,
        proteinG: result.data.proteinG,
        carbsG: result.data.carbsG ?? null,
        fatG: result.data.fatG ?? null
      }
    })

    return res.status(201).json({ nutritionTarget: serializeNutritionTarget(target) })
  } catch (error) {
    next(error)
  }
}

module.exports = { getCurrentNutritionTarget, upsertNutritionTarget }
