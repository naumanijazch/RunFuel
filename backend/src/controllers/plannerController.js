const prisma = require('../lib/prisma')
const { analyzeTrainingLoad } = require('../services/trainingLoad.service')
const { buildTodayDecision } = require('../services/todayDecision.service')
const { generateRunPlan } = require('../services/runPlanner.service')

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
  RUN: 'run',
  REST: 'rest'
}

const GOAL_TO_PRISMA = {
  '5k': 'FIVE_K',
  '10k': 'TEN_K',
  general_endurance: 'GENERAL_ENDURANCE',
  hybrid_conditioning: 'HYBRID_CONDITIONING'
}

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

function recentRunsSince() {
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - 34)
  return since
}

async function loadPlannerInputs(userId) {
  const [settings, schedule, stravaRuns] = await Promise.all([
    prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId }
    }),
    prisma.gymSchedule.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' }
    }),
    prisma.run.findMany({
      where: {
        userId,
        activityDate: { gte: recentRunsSince() }
      },
      orderBy: { activityDate: 'asc' }
    })
  ])

  const userSettings = serializeSettings(settings)
  const gymSchedule = serializeSchedule(schedule)
  const recentRuns = stravaRuns.map(serializeRun)
  const trainingLoadAnalysis = analyzeTrainingLoad({
    userSettings,
    gymSchedule,
    stravaRuns: recentRuns
  })
  const todayDecisionPackage = buildTodayDecision({
    userSettings,
    gymSchedule,
    stravaRuns: recentRuns,
    trainingLoadAnalysis
  })

  return {
    userSettings,
    gymSchedule,
    recentRuns,
    trainingLoadAnalysis,
    todayDecision: todayDecisionPackage.todayDecision
  }
}

async function savePlan(userId, plan) {
  const weekStartDate = startOfCurrentWeek()

  return prisma.generatedPlan.upsert({
    where: {
      userId_weekStartDate: {
        userId,
        weekStartDate
      }
    },
    create: {
      userId,
      weekStartDate,
      goalType: GOAL_TO_PRISMA[plan.goalType] || 'GENERAL_ENDURANCE',
      planJson: plan
    },
    update: {
      goalType: GOAL_TO_PRISMA[plan.goalType] || 'GENERAL_ENDURANCE',
      planJson: plan
    }
  })
}

async function generate(req, res, next) {
  try {
    const inputs = await loadPlannerInputs(req.user.id)
    const plan = generateRunPlan(inputs)

    await savePlan(req.user.id, plan)

    return res.json({ plan })
  } catch (error) {
    next(error)
  }
}

async function current(req, res, next) {
  try {
    const generatedPlan = await prisma.generatedPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: req.user.id,
          weekStartDate: startOfCurrentWeek()
        }
      }
    })

    if (!generatedPlan) {
      return res.json({
        plan: null,
        message: 'No plan generated for this week yet.'
      })
    }

    return res.json({ plan: generatedPlan.planJson })
  } catch (error) {
    next(error)
  }
}

module.exports = { current, generate }
