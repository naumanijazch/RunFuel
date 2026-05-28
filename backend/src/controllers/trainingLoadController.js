const prisma = require('../lib/prisma')
const { buildTodayDecision } = require('../services/todayDecision.service')
const { analyzeTrainingLoad } = require('../services/trainingLoad.service')

const SETTINGS_TO_API = {
  weightUnit: { KG: 'kg', LBS: 'lbs' },
  distanceUnit: { KM: 'km', MILES: 'miles' },
  paceUnit: { MIN_PER_KM: 'min_per_km', MIN_PER_MILE: 'min_per_mile' },
  goalType: {
    FIVE_K: '5k',
    TEN_K: '10k',
    GENERAL_ENDURANCE: 'general_endurance',
    HYBRID_CONDITIONING: 'hybrid_conditioning'
  }
}

const WORKOUT_TO_API = {
  PUSH: 'push',
  PULL: 'pull',
  LEGS: 'legs',
  UPPER: 'upper',
  FULL_BODY: 'full_body',
  EASY_RUN: 'easy_run',
  QUALITY_RUN: 'quality_run',
  REST: 'rest'
}

const defaultSchedule = [
  { dayOfWeek: 1, workoutType: 'push' },
  { dayOfWeek: 2, workoutType: 'easy_run' },
  { dayOfWeek: 3, workoutType: 'pull' },
  { dayOfWeek: 4, workoutType: 'quality_run' },
  { dayOfWeek: 5, workoutType: 'legs' },
  { dayOfWeek: 6, workoutType: 'full_body' },
  { dayOfWeek: 7, workoutType: 'rest' }
]

function serializeSettings(settings) {
  return {
    weightUnit: SETTINGS_TO_API.weightUnit[settings.weightUnit],
    distanceUnit: SETTINGS_TO_API.distanceUnit[settings.distanceUnit],
    paceUnit: SETTINGS_TO_API.paceUnit[settings.paceUnit],
    easyPaceSecPerKm: settings.easyPaceSecPerKm,
    goalType: SETTINGS_TO_API.goalType[settings.goalType]
  }
}

function serializeSchedule(schedule) {
  if (schedule.length !== 7) {
    return defaultSchedule
  }

  return schedule
    .map((item) => ({
      dayOfWeek: item.dayOfWeek,
      workoutType: WORKOUT_TO_API[item.workoutType]
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
}

function serializeRun(run) {
  return {
    id: run.id,
    name: run.name,
    activityDate: run.activityDate,
    distanceKm: run.distanceKm,
    movingTimeSeconds: run.movingTimeSeconds,
    paceSecPerKm: run.paceSecPerKm,
    averageHeartrate: run.averageHeartrate
  }
}

function startOfCurrentWeek() {
  const start = new Date()
  const day = start.getDay() || 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + 1)
  return start
}

async function getAnalysis(req, res, next) {
  try {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 34)

    const [settings, schedule, stravaRuns, generatedPlan] = await Promise.all([
      prisma.userSettings.upsert({
        where: { userId: req.user.id },
        update: {},
        create: { userId: req.user.id }
      }),
      prisma.gymSchedule.findMany({
        where: { userId: req.user.id },
        orderBy: { dayOfWeek: 'asc' }
      }),
      prisma.run.findMany({
        where: {
          userId: req.user.id,
          activityDate: { gte: since }
        },
        orderBy: { activityDate: 'asc' }
      }),
      prisma.generatedPlan.findUnique({
        where: {
          userId_weekStartDate: {
            userId: req.user.id,
            weekStartDate: startOfCurrentWeek()
          }
        }
      })
    ])

    const userSettings = serializeSettings(settings)
    const gymSchedule = serializeSchedule(schedule)
    const runs = stravaRuns.map(serializeRun)
    const analysis = analyzeTrainingLoad({
      userSettings,
      gymSchedule,
      stravaRuns: runs,
      generatedPlan
    })
    const todayDecision = buildTodayDecision({
      userSettings,
      gymSchedule,
      stravaRuns: runs,
      trainingLoadAnalysis: analysis
    })

    return res.json({
      analysis: {
        ...analysis,
        ...todayDecision,
        coachNotes: todayDecision.coachNotes
      }
    })
  } catch (error) {
    next(error)
  }
}

async function analyzePlan(req, res, next) {
  try {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 34)

    const [settings, schedule, stravaRuns] = await Promise.all([
      prisma.userSettings.upsert({
        where: { userId: req.user.id },
        update: {},
        create: { userId: req.user.id }
      }),
      prisma.gymSchedule.findMany({
        where: { userId: req.user.id },
        orderBy: { dayOfWeek: 'asc' }
      }),
      prisma.run.findMany({
        where: {
          userId: req.user.id,
          activityDate: { gte: since }
        },
        orderBy: { activityDate: 'asc' }
      })
    ])

    const userSettings = serializeSettings(settings)
    const gymSchedule = serializeSchedule(schedule)
    const runs = stravaRuns.map(serializeRun)
    const analysis = analyzeTrainingLoad({
      userSettings,
      gymSchedule,
      stravaRuns: runs,
      generatedPlan: req.body
    })
    const todayDecision = buildTodayDecision({
      userSettings,
      gymSchedule,
      stravaRuns: runs,
      trainingLoadAnalysis: analysis
    })

    return res.json({
      analysis: {
        ...analysis,
        ...todayDecision,
        coachNotes: todayDecision.coachNotes
      }
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { analyzePlan, getAnalysis }
