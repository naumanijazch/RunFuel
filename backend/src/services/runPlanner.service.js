const DAY_LABELS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
}

const RUN_WORKOUT_TYPES = new Set(['run'])

function round(value, decimals = 1) {
  if (!Number.isFinite(Number(value))) {
    return 0
  }

  return Number(Number(value).toFixed(decimals))
}

function roundToHalf(value) {
  return Math.round(Number(value || 0) * 2) / 2
}

function normalizeWorkoutType(workoutType) {
  return String(workoutType || 'rest').toLowerCase()
}

function isRunWorkout(workoutType) {
  return RUN_WORKOUT_TYPES.has(normalizeWorkoutType(workoutType))
}

function getStartOfWeek(date = new Date()) {
  const start = new Date(date)
  const day = start.getDay() || 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + 1)
  return start
}

function formatDateKey(date) {
  const value = new Date(date)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getEndOfWeek(date = new Date()) {
  const end = getStartOfWeek(date)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function isDateInRange(date, start, end) {
  const value = new Date(date).getTime()
  return value >= start.getTime() && value <= end.getTime()
}

function getPlannedRunDays(gymSchedule = []) {
  return gymSchedule
    .filter((day) => isRunWorkout(day.workoutType))
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      label: DAY_LABELS[day.dayOfWeek] || `Day ${day.dayOfWeek}`
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
}

function hasMileageSpike(trainingLoadAnalysis = {}) {
  const stats = trainingLoadAnalysis.weeklyRunStats || {}
  return Number(stats.mileageIncreasePercent || 0) >= 30 || Number(stats.acwr || 0) >= 1.3
}

function hasRecentRuns(recentRuns = []) {
  return recentRuns.length > 0
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value || 0), min), max)
}

function getRunDistribution(plannedRunCount, goalType, trainingLoadAnalysis = {}, todayDecision = {}, recentRuns = []) {
  let easyRunCount = 0
  let qualityRunCount = 0
  const distributionNotes = []
  const readinessLabel = todayDecision.readinessLabel
  const readinessScore = todayDecision.readinessScore
  const mileageSpike = hasMileageSpike(trainingLoadAnalysis)

  if (plannedRunCount === 1) {
    easyRunCount = 1
    qualityRunCount = 0

    if (
      ['5k', '10k', 'hybrid_conditioning'].includes(goalType) &&
      ['Fresh', 'Manageable'].includes(readinessLabel) &&
      !mileageSpike &&
      hasRecentRuns(recentRuns) &&
      Number(readinessScore ?? 0) < 7
    ) {
      easyRunCount = 0
      qualityRunCount = 1
      distributionNotes.push('With one run day, this week uses a controlled quality session because readiness and recent load allow it.')
    }
  } else if (plannedRunCount === 2) {
    easyRunCount = 1
    qualityRunCount = 1
  } else if (plannedRunCount === 3) {
    easyRunCount = 2
    qualityRunCount = 1
  } else if (plannedRunCount === 4) {
    easyRunCount = 2
    qualityRunCount = 2
    distributionNotes.push('With four run days, the added run becomes a second quality stimulus: one intervals session and one controlled quality run.')
  } else if (plannedRunCount > 4) {
    qualityRunCount = 2
    easyRunCount = plannedRunCount - qualityRunCount
    distributionNotes.push('Quality is capped at two sessions; additional run days become aerobic easy volume.')
  }

  if (goalType === 'general_endurance' && plannedRunCount === 2 && qualityRunCount === 1) {
    distributionNotes.push('For general endurance, the quality day is kept steady rather than aggressive intervals.')
  }

  if (goalType === 'hybrid_conditioning' && plannedRunCount >= 4 && qualityRunCount === 2) {
    distributionNotes.push('For hybrid conditioning, both quality sessions stay short and controlled to protect lifting performance.')
  }

  if (readinessLabel === 'Compromised' || Number(readinessScore ?? 0) >= 10) {
    easyRunCount = plannedRunCount
    qualityRunCount = 0
    distributionNotes.push('Current readiness is compromised, so planned runs are converted to easy aerobic work.')
  } else if (mileageSpike) {
    easyRunCount = plannedRunCount
    qualityRunCount = 0
    distributionNotes.push('Mileage is already elevated, so this week is biased toward easy running.')
  }

  return { easyRunCount, qualityRunCount, distributionNotes }
}

function calculateRunningBaseline(recentRuns = [], trainingLoadAnalysis = {}, userSettings = {}, plannedRunCount = 0) {
  const stats = trainingLoadAnalysis.weeklyRunStats || {}
  const validRuns = recentRuns.filter((run) => Number(run.distanceKm) > 0)
  const last28DayKm =
    Number.isFinite(Number(stats.last28DayKm))
      ? Number(stats.last28DayKm)
      : validRuns.reduce((total, run) => total + Number(run.distanceKm || 0), 0)
  const currentWeekKm = Number(stats.currentWeekKm || 0)
  const previousWeekKm = Number(stats.previousWeekKm || 0)

  if (!validRuns.length) {
    const fallbackDistance = Math.max(plannedRunCount, 1) * 4
    return {
      currentWeekKm: round(currentWeekKm),
      previousWeekKm: round(previousWeekKm),
      last28DayKm: 0,
      baselineWeeklyDistanceKm: fallbackDistance,
      recentAverageRunDistanceKm: 4,
      recentAveragePaceSecPerKm: userSettings.easyPaceSecPerKm || null,
      hasRecentHistory: false
    }
  }

  const averageDistance = validRuns.reduce((total, run) => total + Number(run.distanceKm || 0), 0) / validRuns.length
  const paceRuns = validRuns.filter((run) => Number(run.paceSecPerKm) > 0)
  const averagePace = paceRuns.length
    ? paceRuns.reduce((total, run) => total + Number(run.paceSecPerKm || 0), 0) / paceRuns.length
    : userSettings.easyPaceSecPerKm || null

  return {
    currentWeekKm: round(currentWeekKm),
    previousWeekKm: round(previousWeekKm),
    last28DayKm: round(last28DayKm),
    baselineWeeklyDistanceKm: round(last28DayKm / 4),
    recentAverageRunDistanceKm: round(averageDistance),
    recentAveragePaceSecPerKm: averagePace ? Math.round(averagePace) : null,
    hasRecentHistory: true
  }
}

function calculateTargetWeeklyDistance({
  baselineWeeklyDistanceKm,
  previousWeekKm,
  currentWeekKm,
  todayDecision = {},
  trainingLoadAnalysis = {},
  plannedRunCount,
  hasRecentHistory,
  goalType = 'general_endurance'
}) {
  const readinessLabel = todayDecision.readinessLabel
  const readinessScore = todayDecision.readinessScore
  const easyMinimumKm = plannedRunCount >= 3 ? 5 : hasRecentHistory ? 5 : 4
  const minimum = plannedRunCount * easyMinimumKm
  let target = Math.max(Number(baselineWeeklyDistanceKm || 0), Number(previousWeekKm || 0), minimum)

  if (readinessLabel === 'Fresh' || readinessLabel === 'Manageable') {
    target *= Number(readinessScore ?? 0) < 4 ? 1.1 : 1.05
  } else if (readinessLabel === 'Loaded') {
    target *= 1
  } else if (readinessLabel === 'Compromised') {
    target *= 0.85
  }

  if (hasMileageSpike(trainingLoadAnalysis)) {
    target = Math.max(Number(currentWeekKm || 0), Number(previousWeekKm || 0), minimum)
  }

  if (goalType === '10k' || goalType === 'general_endurance') {
    target *= 1.05
  } else if (goalType === 'hybrid_conditioning') {
    target *= 0.95
  }

  if (previousWeekKm > 0) {
    target = Math.min(target, previousWeekKm * 1.15)
  }

  target = Math.max(target, minimum)

  return roundToHalf(target)
}

function allocateRunDistances({
  targetWeeklyDistanceKm,
  easyRunCount,
  qualityRunCount,
  plannedRunCount,
  recentAverageRunDistanceKm = 5,
  goalType = 'general_endurance'
}) {
  if (!plannedRunCount) {
    return { easyDistances: [], qualityDistances: [] }
  }

  if (plannedRunCount === 1) {
    const distance = Math.max(5, roundToHalf(targetWeeklyDistanceKm))
    return qualityRunCount ? { easyDistances: [], qualityDistances: [distance] } : { easyDistances: [distance], qualityDistances: [] }
  }

  const easyAnchor = clamp(recentAverageRunDistanceKm * 1.1, 5, goalType === '10k' || goalType === 'general_endurance' ? 10 : 9)
  const longEasyAnchor = clamp(recentAverageRunDistanceKm * 1.25, 6, goalType === '10k' || goalType === 'general_endurance' ? 12 : 10)
  const qualityShare = qualityRunCount
    ? qualityRunCount === 2 ? 0.38 : plannedRunCount === 2 ? 0.4 : plannedRunCount === 3 ? 0.3 : 0.25
    : 0
  const qualityTotal = qualityRunCount ? Math.max(qualityRunCount * 3, roundToHalf(targetWeeklyDistanceKm * qualityShare)) : 0
  const easyTotal = Math.max(easyRunCount * 5, roundToHalf(targetWeeklyDistanceKm - qualityTotal))
  const easyDistances = []

  if (easyRunCount === 1) {
    easyDistances.push(Math.max(5, roundToHalf(easyTotal)))
  } else if (easyRunCount > 1) {
    const longEasy = Math.min(roundToHalf(longEasyAnchor), roundToHalf(easyTotal - (easyRunCount - 1) * 5))
    easyDistances.push(Math.max(6, longEasy))

    const remainingEasyTotal = easyTotal - easyDistances[0]
    const remainingEasyCount = easyRunCount - 1
    for (let index = 0; index < remainingEasyCount; index += 1) {
      const remaining = remainingEasyTotal - roundToHalf(easyAnchor) * index
      const distance = index === remainingEasyCount - 1 ? remaining : roundToHalf(easyAnchor)
      easyDistances.push(Math.max(5, roundToHalf(distance)))
    }
  }

  const qualityDistances = Array.from({ length: qualityRunCount }, (_, index) => {
    const qualityBase = qualityRunCount ? qualityTotal / qualityRunCount : 0
    const remaining = qualityTotal - roundToHalf(qualityBase) * index
    return index === qualityRunCount - 1 ? Math.max(3, roundToHalf(remaining)) : Math.max(3, roundToHalf(qualityBase))
  })

  return { easyDistances, qualityDistances }
}

function shiftDay(dayOfWeek, offset) {
  return ((dayOfWeek - 1 + offset + 7) % 7) + 1
}

function assignRunTypesToDays({ plannedRunDays, gymSchedule = [], easyRunCount, qualityRunCount, trainingLoadAnalysis = {} }) {
  const scheduleByDay = new Map(gymSchedule.map((day) => [day.dayOfWeek, normalizeWorkoutType(day.workoutType)]))
  const rollingByDay = new Map((trainingLoadAnalysis.rollingFatigue?.scoresByDay || []).map((score) => [score.dayOfWeek, score]))
  const currentWeekActualRunDays = new Set(
    (trainingLoadAnalysis.runClassifications || []).map((run) => run.dayOfWeek).filter(Boolean)
  )
  const scoredDays = plannedRunDays.map((day) => {
    let qualitySuitabilityScore = 100
    const previousWorkout = scheduleByDay.get(shiftDay(day.dayOfWeek, -1)) || 'rest'
    const nextWorkout = scheduleByDay.get(shiftDay(day.dayOfWeek, 1)) || 'rest'
    const fatigue = rollingByDay.get(day.dayOfWeek)

    if (previousWorkout === 'legs') qualitySuitabilityScore -= 40
    if (nextWorkout === 'legs') qualitySuitabilityScore -= 35
    if (currentWeekActualRunDays.has(day.dayOfWeek)) qualitySuitabilityScore -= 30
    if (fatigue?.classification === 'high') qualitySuitabilityScore -= 25
    if (previousWorkout === 'full_body') qualitySuitabilityScore -= 20
    if (nextWorkout === 'full_body') qualitySuitabilityScore -= 20
    if (['upper', 'push', 'pull'].includes(previousWorkout) || ['upper', 'push', 'pull'].includes(nextWorkout)) {
      qualitySuitabilityScore -= 10
    }

    return { ...day, qualitySuitabilityScore }
  })

  const qualityDays = qualityRunCount
    ? [...scoredDays].sort((a, b) => b.qualitySuitabilityScore - a.qualitySuitabilityScore).slice(0, qualityRunCount)
    : []
  const qualityDayNumbers = new Set(qualityDays.map((day) => day.dayOfWeek))

  return plannedRunDays.map((day) => ({
    ...day,
    plannedRunKind: qualityDayNumbers.has(day.dayOfWeek) ? 'quality' : easyRunCount > 0 ? 'easy' : 'easy',
    qualitySuitabilityScore: scoredDays.find((scoredDay) => scoredDay.dayOfWeek === day.dayOfWeek)?.qualitySuitabilityScore ?? 100
  }))
}

function buildEasyRun({ distanceKm, easyPaceSecPerKm, easyRole = 'aerobic' }) {
  const easyPace = easyPaceSecPerKm || 420
  const variants = {
    long: {
      title: 'Long Easy Run',
      description: 'Long conversational aerobic run. Keep the effort relaxed from start to finish.',
      purpose: 'Extend aerobic durability while keeping intensity low enough for gym recovery.'
    },
    recovery: {
      title: 'Recovery Easy Run',
      description: 'Shorter easy run with relaxed cadence and no pace chasing.',
      purpose: 'Add low-cost aerobic volume and support recovery around lifting.'
    },
    progression: {
      title: 'Easy Progression Run',
      description: 'Start very easy, then finish the final 10 minutes slightly quicker but still conversational.',
      purpose: 'Differentiate easy volume without turning it into a hard workout.'
    },
    aerobic: {
      title: 'Easy Aerobic Run',
      description: 'Conversational aerobic run. Do not chase pace.',
      purpose: 'Build aerobic base without interfering with gym recovery.'
    }
  }
  const variant = variants[easyRole] || variants.aerobic

  return {
    runType: 'easy',
    easyRole,
    title: variant.title,
    distanceKm,
    paceRangeSecPerKm: {
      from: easyPace,
      to: easyPace + 45
    },
    paceGuidance: 'Conversational pace. Do not chase pace.',
    description: variant.description,
    purpose: variant.purpose
  }
}

function buildQualityRun({ goalType, distanceKm, easyPaceSecPerKm, readinessLabel, qualityRole = 'primary' }) {
  if (readinessLabel === 'Compromised') {
    return buildEasyRun({ distanceKm, easyPaceSecPerKm })
  }

  const loaded = readinessLabel === 'Loaded'
  const secondary = qualityRole === 'secondary'

  if (loaded || goalType === 'general_endurance') {
    return {
      runType: secondary ? 'intervals' : goalType === 'general_endurance' ? 'steady' : 'quality',
      qualityRole,
      title: secondary ? 'Controlled Intervals' : goalType === 'general_endurance' ? 'Steady Aerobic Run' : 'Controlled Quality Run',
      distanceKm,
      structure: secondary
        ? 'Warm up 10 min, then 6 x 90s strong with 90s easy recovery, cool down.'
        : 'Run easy for the first half, then slightly quicker but controlled for the second half.',
      paceGuidance: 'Comfortably controlled. Finish feeling like you could keep going.',
      purpose: 'Add aerobic quality without creating unnecessary soreness for gym work.'
    }
  }

  if (goalType === '5k') {
    return {
      runType: secondary ? 'quality' : 'intervals',
      qualityRole,
      title: secondary ? 'Controlled 5K Quality Run' : '5K Intervals',
      distanceKm,
      structure: secondary
        ? 'Warm up 10 min, then 3 x 4 min strong with 2 min easy recovery, cool down.'
        : distanceKm >= 5
        ? 'Warm up 10 min, then 4 x 800m hard with 2 min easy recovery, cool down 5-10 min.'
        : 'Warm up 10 min, then 5 x 400m hard with 90s easy recovery, cool down 5-10 min.',
      paceGuidance: 'Hard but controlled. Faster than easy pace without sprinting.',
      purpose: 'Improve 5K-specific speed while keeping the session short enough for hybrid training.'
    }
  }

  if (goalType === '10k') {
    return {
      runType: secondary ? 'intervals' : 'quality',
      qualityRole,
      title: secondary ? '10K Longer Intervals' : 'Controlled 10K Quality Run',
      distanceKm,
      structure: secondary
        ? 'Warm up 10 min, then 4 x 3 min strong with 2 min easy jog, cool down.'
        : 'Warm up 10 min, then 2 x 8 min comfortably hard with 3 min easy jog, cool down.',
      paceGuidance: 'Comfortably hard. Strong rhythm, not a time trial.',
      purpose: 'Build sustained 10K strength without stacking excessive lower-body fatigue.'
    }
  }

  return {
    runType: secondary ? 'quality' : 'intervals',
    qualityRole,
    title: secondary ? 'Controlled Hybrid Quality Run' : 'Short Controlled Intervals',
    distanceKm,
    structure: secondary
      ? 'Warm up 10 min, then 12 min steady-hard but controlled, cool down.'
      : 'Warm up 10 min, then 8 x 1 min hard / 1 min easy, cool down.',
    paceGuidance: 'Sharp but controlled. Stop before form breaks down.',
    purpose: 'Build conditioning with limited soreness and minimal interference with lifting.'
  }
}

function buildPlannerWarnings({ planDays, targetWeeklyDistanceKm, baselineWeeklyDistanceKm, trainingLoadAnalysis = {}, todayDecision = {} }) {
  const warnings = []
  const hasTrueRestDay = planDays.some((day) => day.scheduledWorkoutType === 'rest' && !day.plannedRun)
  const mileageSpike = hasMileageSpike(trainingLoadAnalysis)
  const weekStart = getStartOfWeek(new Date())
  const weekEnd = getEndOfWeek(new Date())
  const actualRunDaysThisWeek = new Set(
    (trainingLoadAnalysis.runClassifications || [])
      .filter((run) => isDateInRange(run.activityDate, weekStart, weekEnd))
      .map((run) => run.dayOfWeek)
  )

  planDays.forEach((day) => {
    if (!day.plannedRun) return

    const previous = planDays.find((item) => item.dayOfWeek === shiftDay(day.dayOfWeek, -1))
    const next = planDays.find((item) => item.dayOfWeek === shiftDay(day.dayOfWeek, 1))
    const isQuality = day.plannedRun.runType !== 'easy'
    const nearLegs = previous?.scheduledWorkoutType === 'legs' || next?.scheduledWorkoutType === 'legs'
    const afterLegs = previous?.scheduledWorkoutType === 'legs'

    if (isQuality && nearLegs) {
      warnings.push({
        severity: mileageSpike || !hasTrueRestDay || todayDecision.readinessLabel === 'Compromised' ? 'high' : 'medium',
        code: 'QUALITY_NEAR_LEGS',
        title: 'Quality near leg day',
        message: `${day.label} quality work sits next to a leg day.`,
        suggestion: 'Keep the run controlled and avoid adding extra lower-body volume.'
      })
    }

    if (day.plannedRun.runType === 'easy' && afterLegs) {
      warnings.push({
        severity: 'low',
        code: 'EASY_AFTER_LEGS',
        title: 'Easy run after legs',
        message: `${day.label} follows leg day, so it is kept easy.`,
        suggestion: 'Use conversational effort and let the run support recovery.'
      })
    }

    if (actualRunDaysThisWeek.has(day.dayOfWeek)) {
      warnings.push({
        severity: day.plannedRun.runType === 'easy' ? 'low' : 'medium',
        code: 'PLANNED_RUN_ALREADY_COMPLETED',
        title: 'Run already completed',
        message: `${day.label} already has a synced Strava run this week.`,
        suggestion: 'Use this plan as guidance for remaining work rather than doubling the same day.'
      })
    }
  })

  if (!hasTrueRestDay) {
    warnings.push({
      severity: mileageSpike || todayDecision.readinessLabel === 'Compromised' ? 'high' : 'medium',
      code: 'NO_TRUE_REST_DAY',
      title: 'No true rest day',
      message: 'This schedule does not include a full rest day.',
      suggestion: 'Keep optional conditioning low and consider adding one rest day in Settings.'
    })
  }

  if (targetWeeklyDistanceKm > baselineWeeklyDistanceKm * 1.2 && baselineWeeklyDistanceKm > 0) {
    warnings.push({
      severity: 'medium',
      code: 'TARGET_ABOVE_BASELINE',
      title: 'Distance above baseline',
      message: 'The target distance is above your recent Strava baseline.',
      suggestion: 'Treat the target as a ceiling if fatigue rises during the week.'
    })
  }

  if (mileageSpike) {
    warnings.push({
      severity: 'medium',
      code: 'MILEAGE_ELEVATED',
      title: 'Load caution',
      message: 'Mileage is already elevated, so this plan avoids extra run intensity.',
      suggestion: 'Let easy running do the work this week.'
    })
  }

  if (todayDecision.readinessLabel === 'Compromised') {
    warnings.push({
      severity: 'medium',
      code: 'READINESS_COMPROMISED',
      title: 'Recovery caution',
      message: 'Today readiness is compromised, so intensity is removed from this plan.',
      suggestion: 'Keep runs easy unless recovery improves.'
    })
  }

  return warnings
}

function generatePlannerExplanation({
  planDays,
  targetWeeklyDistanceKm,
  baselineWeeklyDistanceKm,
  easyRunCount,
  qualityRunCount,
  trainingLoadAnalysis = {},
  todayDecision = {}
}) {
  const explanations = [
    `Your plan includes ${easyRunCount} easy run${easyRunCount === 1 ? '' : 's'} and ${qualityRunCount} quality run${qualityRunCount === 1 ? '' : 's'} because your schedule has ${easyRunCount + qualityRunCount} run day${easyRunCount + qualityRunCount === 1 ? '' : 's'}.`
  ]
  const qualityDay = planDays.find((day) => day.plannedRun && day.plannedRun.runType !== 'easy')

  if (qualityDay) {
    explanations.push(`The quality run was placed on ${qualityDay.label} because it scored best against nearby leg and full-body sessions.`)
  }

  planDays
    .filter((day) => day.plannedRun?.runType === 'easy')
    .forEach((day) => {
      const nextDay = planDays.find((item) => item.dayOfWeek === shiftDay(day.dayOfWeek, 1))
      const previousDay = planDays.find((item) => item.dayOfWeek === shiftDay(day.dayOfWeek, -1))

      if (nextDay?.scheduledWorkoutType === 'legs' || previousDay?.scheduledWorkoutType === 'legs') {
        explanations.push(`${day.label} is kept easy to protect nearby lower-body training.`)
      }
    })

  if (baselineWeeklyDistanceKm > 0) {
    explanations.push(`Weekly distance is kept close to your recent Strava baseline of ${round(baselineWeeklyDistanceKm)} km.`)
  }

  if (todayDecision.readinessLabel === 'Loaded') {
    explanations.push("Because today's readiness is Loaded, this plan avoids adding extra running volume.")
  } else if (todayDecision.readinessLabel === 'Compromised') {
    explanations.push("Because today's readiness is Compromised, this plan removes run intensity.")
  } else if (todayDecision.readinessScore !== null && todayDecision.readinessScore !== undefined) {
    explanations.push(`Readiness score ${round(todayDecision.readinessScore)} supports the selected intensity split.`)
  }

  if (hasMileageSpike(trainingLoadAnalysis)) {
    explanations.push('Mileage is already elevated, so this week emphasizes easy running over intensity.')
  }

  explanations.push(`Target weekly distance is ${round(targetWeeklyDistanceKm)} km across planned run days.`)

  return Array.from(new Set(explanations))
}

function generateRunPlan({ userSettings = {}, gymSchedule = [], recentRuns = [], trainingLoadAnalysis = {}, todayDecision = {} }) {
  const weekStart = getStartOfWeek(new Date())
  const weekStartDate = formatDateKey(weekStart)
  const goalType = userSettings.goalType || 'general_endurance'
  const easyPaceSecPerKm = userSettings.easyPaceSecPerKm || userSettings.recentAveragePaceSecPerKm || 420
  const plannedRunDays = getPlannedRunDays(gymSchedule)
  const plannerWarnings = []

  if (!plannedRunDays.length) {
    plannerWarnings.push({
      severity: 'medium',
      code: 'NO_RUN_DAYS',
      title: 'No run days',
      message: 'No run days are set in your weekly schedule.',
      suggestion: 'Add at least one run day in Settings to generate a running plan.'
    })
  }

  const plannedRunCount = plannedRunDays.length
  const baseline = calculateRunningBaseline(recentRuns, trainingLoadAnalysis, userSettings, plannedRunCount)
  const distribution = getRunDistribution(plannedRunCount, goalType, trainingLoadAnalysis, todayDecision, recentRuns)
  const targetWeeklyDistanceKm = plannedRunCount
    ? calculateTargetWeeklyDistance({
      ...baseline,
      todayDecision,
      trainingLoadAnalysis,
      plannedRunCount,
      goalType
    })
    : 0
  const distances = allocateRunDistances({
    targetWeeklyDistanceKm,
    easyRunCount: distribution.easyRunCount,
    qualityRunCount: distribution.qualityRunCount,
    plannedRunCount,
    recentAverageRunDistanceKm: baseline.recentAverageRunDistanceKm,
    goalType
  })
  const assignedRunDays = assignRunTypesToDays({
    plannedRunDays,
    gymSchedule,
    easyRunCount: distribution.easyRunCount,
    qualityRunCount: distribution.qualityRunCount,
    trainingLoadAnalysis
  })
  const easyQueue = [...distances.easyDistances]
  const qualityQueue = [...distances.qualityDistances]
  const easyRoleQueue = [...distances.easyDistances]
    .map((distanceKm, index) => ({ distanceKm, index }))
    .sort((a, b) => b.distanceKm - a.distanceKm)
    .reduce((roles, item, sortedIndex) => {
      roles[item.index] = sortedIndex === 0 && distances.easyDistances.length > 1 ? 'long' : sortedIndex === 1 ? 'recovery' : 'progression'
      return roles
    }, [])
  const qualityRoleQueue = distribution.qualityRunCount >= 2
    ? ['primary', 'secondary']
    : ['primary']
  const runByDay = new Map()
  let easyIndex = 0
  let qualityIndex = 0

  assignedRunDays.forEach((day) => {
    const isQuality = day.plannedRunKind === 'quality' && distribution.qualityRunCount > 0
    const distanceKm = isQuality ? qualityQueue.shift() : easyQueue.shift()
    const workout = isQuality
      ? buildQualityRun({
        goalType,
        distanceKm,
        easyPaceSecPerKm,
        readinessLabel: todayDecision.readinessLabel,
        qualityRole: qualityRoleQueue[qualityIndex++] || 'primary'
      })
      : buildEasyRun({
        distanceKm,
        easyPaceSecPerKm,
        easyRole: easyRoleQueue[easyIndex++] || 'aerobic'
      })

    runByDay.set(day.dayOfWeek, {
      ...workout,
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      qualitySuitabilityScore: day.qualitySuitabilityScore
    })
  })

  const scheduleByDay = new Map(gymSchedule.map((day) => [day.dayOfWeek, day]))
  const planDays = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
    const scheduled = scheduleByDay.get(dayOfWeek) || { dayOfWeek, workoutType: 'rest' }

    return {
      dayOfWeek,
      label: DAY_LABELS[dayOfWeek],
      scheduledWorkoutType: normalizeWorkoutType(scheduled.workoutType),
      notes: scheduled.notes || null,
      plannedRun: runByDay.get(dayOfWeek) || null
    }
  })
  const runWorkouts = planDays.filter((day) => day.plannedRun).map((day) => day.plannedRun)
  const conflictWarnings = plannedRunCount
    ? buildPlannerWarnings({
      planDays,
      targetWeeklyDistanceKm,
      baselineWeeklyDistanceKm: baseline.baselineWeeklyDistanceKm,
      trainingLoadAnalysis,
      todayDecision
    })
    : []
  const explanation = [
    ...distribution.distributionNotes,
    ...generatePlannerExplanation({
      planDays,
      targetWeeklyDistanceKm,
      baselineWeeklyDistanceKm: baseline.baselineWeeklyDistanceKm,
      easyRunCount: distribution.easyRunCount,
      qualityRunCount: distribution.qualityRunCount,
      trainingLoadAnalysis,
      todayDecision
    })
  ]

  return {
    weekStartDate,
    goalType,
    targetWeeklyDistanceKm,
    baselineWeeklyDistanceKm: baseline.baselineWeeklyDistanceKm,
    plannedRunCount,
    easyRunCount: distribution.easyRunCount,
    qualityRunCount: distribution.qualityRunCount,
    baseline,
    planDays,
    runWorkouts,
    plannerWarnings: [...plannerWarnings, ...conflictWarnings],
    explanation,
    summary: plannedRunCount
      ? `This week has ${distribution.easyRunCount} easy run${distribution.easyRunCount === 1 ? '' : 's'} and ${distribution.qualityRunCount} quality run${distribution.qualityRunCount === 1 ? '' : 's'} across ${round(targetWeeklyDistanceKm)} km.`
      : 'No run plan was generated because no run days are set.'
  }
}

module.exports = {
  calculateRunningBaseline,
  calculateTargetWeeklyDistance,
  generateRunPlan,
  getPlannedRunDays,
  getRunDistribution
}
