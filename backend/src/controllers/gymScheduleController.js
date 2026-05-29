const { z } = require('zod')
const prisma = require('../lib/prisma')

const WORKOUT_TO_PRISMA = {
  push: 'PUSH',
  pull: 'PULL',
  legs: 'LEGS',
  upper: 'UPPER',
  full_body: 'FULL_BODY',
  run: 'RUN',
  rest: 'REST'
}

const WORKOUT_TO_API = {
  PUSH: 'push',
  PULL: 'pull',
  LEGS: 'legs',
  UPPER: 'upper',
  FULL_BODY: 'full_body',
  RUN: 'run',
  REST: 'rest'
}

const scheduleItemSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  workoutType: z.enum([
    'push',
    'pull',
    'legs',
    'upper',
    'full_body',
    'run',
    'rest'
  ])
})

const scheduleSchema = z
  .array(scheduleItemSchema)
  .length(7)
  .superRefine((items, ctx) => {
    const days = new Set(items.map((item) => item.dayOfWeek))

    if (days.size !== 7) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Schedule must include one item for each day of week, 1 through 7'
      })
    }
  })

const defaultSchedule = [
  { dayOfWeek: 1, workoutType: 'rest' },
  { dayOfWeek: 2, workoutType: 'rest' },
  { dayOfWeek: 3, workoutType: 'rest' },
  { dayOfWeek: 4, workoutType: 'rest' },
  { dayOfWeek: 5, workoutType: 'rest' },
  { dayOfWeek: 6, workoutType: 'rest' },
  { dayOfWeek: 7, workoutType: 'rest' }
]

function validationError(res, error) {
  return res.status(400).json({
    message: 'Invalid request',
    errors: error.flatten().fieldErrors
  })
}

function serializeSchedule(items) {
  return items
    .map((item) => ({
      dayOfWeek: item.dayOfWeek,
      workoutType: WORKOUT_TO_API[item.workoutType]
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
}

async function createDefaultSchedule(userId) {
  await prisma.gymSchedule.createMany({
    data: defaultSchedule.map((item) => ({
      userId,
      dayOfWeek: item.dayOfWeek,
      workoutType: WORKOUT_TO_PRISMA[item.workoutType]
    })),
    skipDuplicates: true
  })
}

async function getGymSchedule(req, res, next) {
  try {
    let schedule = await prisma.gymSchedule.findMany({
      where: { userId: req.user.id },
      orderBy: { dayOfWeek: 'asc' }
    })

    if (schedule.length !== 7) {
      await prisma.gymSchedule.deleteMany({ where: { userId: req.user.id } })
      await createDefaultSchedule(req.user.id)
      schedule = await prisma.gymSchedule.findMany({
        where: { userId: req.user.id },
        orderBy: { dayOfWeek: 'asc' }
      })
    }

    return res.json({ schedule: serializeSchedule(schedule) })
  } catch (error) {
    next(error)
  }
}

async function updateGymSchedule(req, res, next) {
  try {
    const result = scheduleSchema.safeParse(req.body)

    if (!result.success) {
      return validationError(res, result.error)
    }

    const sortedSchedule = [...result.data].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek
    )

    await prisma.$transaction([
      prisma.gymSchedule.deleteMany({ where: { userId: req.user.id } }),
      prisma.gymSchedule.createMany({
        data: sortedSchedule.map((item) => ({
          userId: req.user.id,
          dayOfWeek: item.dayOfWeek,
          workoutType: WORKOUT_TO_PRISMA[item.workoutType]
        }))
      })
    ])

    return res.json({ schedule: sortedSchedule })
  } catch (error) {
    next(error)
  }
}

module.exports = { getGymSchedule, updateGymSchedule }
