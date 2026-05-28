const DAY_LABELS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
}

const WARNING_SEVERITY_RANK = {
  high: 3,
  medium: 2,
  moderate: 2,
  low: 1
}

const TODAY_RELEVANT_CODES = new Set([
  'NO_TRUE_REST_DAY',
  'REST_DAY_USED_FOR_RUN',
  'MIXED_HIGH_LOAD_DAY',
  'HIGH_ROLLING_FATIGUE'
])

function normalizeWorkoutType(workoutType) {
  const normalized = String(workoutType || 'rest').toLowerCase()
  return ['run', 'easy_run', 'quality_run'].includes(normalized) ? 'run' : normalized
}

function isPlannedRun(workoutType) {
  return normalizeWorkoutType(workoutType) === 'run'
}

function isSameLocalDay(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getStartOfWeek(date = new Date()) {
  const start = new Date(date)
  const day = start.getDay() || 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + 1)
  return start
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

function getTodayDayOfWeekMondayBased() {
  return new Date().getDay() || 7
}

function getDayOfWeekMondayBased(date) {
  return new Date(date).getDay() || 7
}

function getDayLabel(dayOfWeek) {
  return DAY_LABELS[dayOfWeek] || 'Today'
}

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDay(dayOfWeek, offset) {
  return ((dayOfWeek - 1 + offset + 7) % 7) + 1
}

function formatWorkoutType(workoutType) {
  const normalized = normalizeWorkoutType(workoutType)
  return {
    push: 'Push',
    pull: 'Pull',
    legs: 'Legs',
    upper: 'Upper',
    full_body: 'Full body',
    run: 'Run',
    rest: 'Rest'
  }[normalized] || 'Rest'
}

function getReadinessFromScore(readinessScore) {
  if (readinessScore === null || readinessScore === undefined) {
    return {
      readinessLabel: 'Unknown',
      readinessMeaning: 'Not enough training-load data to estimate today yet.'
    }
  }

  if (readinessScore < 4) {
    return {
      readinessLabel: 'Fresh',
      readinessMeaning: 'Good day to train normally.'
    }
  }

  if (readinessScore < 7) {
    return {
      readinessLabel: 'Manageable',
      readinessMeaning: 'Normal training load. Train as planned.'
    }
  }

  if (readinessScore < 10) {
    return {
      readinessLabel: 'Loaded',
      readinessMeaning: 'Training is accumulating. Train as planned, but avoid unnecessary extras.'
    }
  }

  return {
    readinessLabel: 'Compromised',
    readinessMeaning: 'Recovery is likely limited. Consider modifying intensity or volume.'
  }
}

function buildRunPlanStatus({ gymSchedule, stravaRuns, todayDayOfWeek }) {
  const plannedRunDays = gymSchedule
    .filter((day) => isPlannedRun(day.workoutType))
    .map((day) => day.dayOfWeek)
    .sort((a, b) => a - b)
  const weekStart = getStartOfWeek(new Date())
  const weekEnd = getEndOfWeek(new Date())
  const completedRunsSoFar = stravaRuns.filter((run) => {
    const runDate = new Date(run.activityDate)
    return isDateInRange(runDate, weekStart, weekEnd) && getDayOfWeekMondayBased(runDate) <= todayDayOfWeek
  }).length
  const plannedRunsDueSoFar = plannedRunDays.filter((dayOfWeek) => dayOfWeek <= todayDayOfWeek).length
  const upcomingPlannedRuns = plannedRunDays
    .filter((dayOfWeek) => dayOfWeek > todayDayOfWeek)
    .map((dayOfWeek) => ({
      dayOfWeek,
      dayLabel: getDayLabel(dayOfWeek)
    }))
  const extraRunsSoFar = Math.max(0, completedRunsSoFar - plannedRunsDueSoFar)

  if (plannedRunsDueSoFar === 0 && completedRunsSoFar === 0) {
    return {
      status: 'no_run_due_yet',
      completedRunsSoFar,
      plannedRunsDueSoFar,
      plannedRunsThisWeek: plannedRunDays.length,
      upcomingPlannedRuns,
      extraRunsSoFar,
      message: 'No planned runs were due yet this week.'
    }
  }

  if (completedRunsSoFar === plannedRunsDueSoFar) {
    return {
      status: 'on_track',
      completedRunsSoFar,
      plannedRunsDueSoFar,
      plannedRunsThisWeek: plannedRunDays.length,
      upcomingPlannedRuns,
      extraRunsSoFar,
      message: 'You are on track with your planned runs so far.'
    }
  }

  if (completedRunsSoFar < plannedRunsDueSoFar) {
    return {
      status: 'behind',
      completedRunsSoFar,
      plannedRunsDueSoFar,
      plannedRunsThisWeek: plannedRunDays.length,
      upcomingPlannedRuns,
      extraRunsSoFar,
      message: 'You are behind your planned runs due so far.'
    }
  }

  return {
    status: 'ahead_or_extra',
    completedRunsSoFar,
    plannedRunsDueSoFar,
    plannedRunsThisWeek: plannedRunDays.length,
    upcomingPlannedRuns,
    extraRunsSoFar,
    message: 'You have completed more runs than planned so far.'
  }
}

function buildWeeklyLoadContext({ weeklyRunStats, todayDayOfWeek }) {
  const currentWeekKm = weeklyRunStats?.currentWeekKm ?? 0
  const previousWeekKm = weeklyRunStats?.previousWeekKm ?? null
  const mileageChangePercent = weeklyRunStats?.mileageIncreasePercent ?? null

  if (!previousWeekKm) {
    return {
      status: 'insufficient_history',
      currentWeekKm,
      previousWeekKm,
      mileageChangePercent,
      message: 'Not enough previous running history to compare weekly mileage yet.'
    }
  }

  if (mileageChangePercent >= 30) {
    return {
      status: 'large_increase',
      currentWeekKm,
      previousWeekKm,
      mileageChangePercent,
      message: 'Your mileage is already much higher than last week. Avoid adding extra volume unless it was planned.'
    }
  }

  if (mileageChangePercent >= 15) {
    return {
      status: 'moderate_increase',
      currentWeekKm,
      previousWeekKm,
      mileageChangePercent,
      message: 'Your mileage is trending above last week. Keep upcoming runs controlled.'
    }
  }

  if (mileageChangePercent <= -30 && todayDayOfWeek < 6) {
    return {
      status: 'lower_but_week_not_over',
      currentWeekKm,
      previousWeekKm,
      mileageChangePercent,
      message: 'Your mileage is currently below last week, but the week is not over yet.'
    }
  }

  if (mileageChangePercent <= -30 && todayDayOfWeek >= 6) {
    return {
      status: 'lower_week',
      currentWeekKm,
      previousWeekKm,
      mileageChangePercent,
      message: 'Your mileage is lower than last week, which may be useful if fatigue has been accumulating.'
    }
  }

  return {
    status: 'stable',
    currentWeekKm,
    previousWeekKm,
    mileageChangePercent,
    message: 'Your weekly mileage is broadly stable compared with last week.'
  }
}

function splitWarnings(conflicts = [], todayDayOfWeek) {
  const nearbyDays = new Set([shiftDay(todayDayOfWeek, -1), todayDayOfWeek, shiftDay(todayDayOfWeek, 1)])
  const sortedConflicts = [...conflicts].sort(
    (a, b) => (WARNING_SEVERITY_RANK[b.severity] || 0) - (WARNING_SEVERITY_RANK[a.severity] || 0)
  )
  const relevantTodayWarnings = sortedConflicts.filter((conflict) => {
    const affectedDays = conflict.affectedDays || []
    const affectsNearbyDay = affectedDays.some((dayOfWeek) => nearbyDays.has(dayOfWeek))
    return affectsNearbyDay || TODAY_RELEVANT_CODES.has(conflict.code)
  })
  const relevantKeys = new Set(relevantTodayWarnings.slice(0, 3).map((conflict) => conflictKey(conflict)))
  const fullWeekWarnings = sortedConflicts.filter((conflict) => !relevantKeys.has(conflictKey(conflict)))

  return {
    relevantTodayWarnings: relevantTodayWarnings.slice(0, 3),
    fullWeekWarnings
  }
}

function conflictKey(conflict) {
  return `${conflict.code}:${(conflict.affectedDays || []).join(',')}:${conflict.message}`
}

function getClassifiedRunsForDate(trainingLoadAnalysis, date) {
  return (trainingLoadAnalysis?.runClassifications || []).filter((run) => isSameLocalDay(run.activityDate, date))
}

function hasHardRun(runs = []) {
  return runs.some((run) => ['tempo', 'quality', 'quality-long'].includes(run.runType))
}

function chooseRecommendationType({
  readinessLabel,
  scheduledWorkoutType,
  relevantTodayWarnings,
  todayRuns,
  yesterdayRuns,
  yesterdayWorkoutType,
  runPlanStatus
}) {
  const hasHighRelevantWarning = relevantTodayWarnings.some((warning) => warning.severity === 'high')

  if (scheduledWorkoutType === 'rest') {
    if (todayRuns.length > 0) {
      return hasHighRelevantWarning || readinessLabel === 'Compromised' ? 'modify_session' : 'train_but_control_extras'
    }

    return hasHighRelevantWarning || readinessLabel === 'Compromised' ? 'modify_session' : 'prioritize_recovery'
  }

  if (readinessLabel === 'Compromised') {
    return 'modify_session'
  }

  if (scheduledWorkoutType === 'legs' && hasHardRun(yesterdayRuns)) {
    return 'train_but_control_extras'
  }

  if (scheduledWorkoutType === 'run' && yesterdayWorkoutType === 'legs') {
    return 'modify_session'
  }

  if (runPlanStatus.status === 'behind' && scheduledWorkoutType !== 'run') {
    return 'no_action_needed'
  }

  if (readinessLabel === 'Loaded') {
    return 'train_but_control_extras'
  }

  if (['Fresh', 'Manageable'].includes(readinessLabel) && !hasHighRelevantWarning) {
    return 'train_as_planned'
  }

  return hasHighRelevantWarning ? 'modify_session' : 'train_but_control_extras'
}

function buildRecommendationText({
  recommendationType,
  scheduledWorkoutType,
  readinessLabel,
  runPlanStatus,
  weeklyLoadContext,
  todayRuns,
  yesterdayRuns,
  yesterdayWorkoutType
}) {
  const scheduledLabel = formatWorkoutType(scheduledWorkoutType).toLowerCase()
  const hadHardRunYesterday = hasHardRun(yesterdayRuns)

  if (scheduledWorkoutType === 'rest') {
    if (todayRuns.length > 0) {
      return {
        headline: 'Protect the rest of today.',
        recommendation: 'A run happened on a scheduled rest day. That can be intentional, but avoid turning the rest of the day into more training load.',
        suggestedAction: 'Keep any remaining work low-load and restore a true recovery window soon.'
      }
    }

    return {
      headline: 'Use today as a real recovery day.',
      recommendation: 'You have a scheduled rest day. Keeping it low-load will make the next quality session more productive.',
      suggestedAction: 'Avoid adding an unplanned run unless you intentionally want to trade off recovery.'
    }
  }

  if (scheduledWorkoutType === 'run' && yesterdayWorkoutType === 'legs') {
    return {
      headline: 'Run today, but keep it easy.',
      recommendation: 'Because yesterday was leg day, today is better suited for an easy aerobic run rather than intervals or tempo.',
      suggestedAction: 'Keep the pace conversational and avoid chasing Strava pace.'
    }
  }

  if (runPlanStatus.status === 'no_run_due_yet' && weeklyLoadContext.status === 'lower_but_week_not_over') {
    return {
      headline: 'You are not behind yet.',
      recommendation: 'Your mileage is currently lower than last week, but your next planned run is still upcoming.',
      suggestedAction: 'Follow the plan instead of forcing extra mileage early.'
    }
  }

  if (recommendationType === 'modify_session') {
    return {
      headline: `Modify today's ${scheduledLabel} session.`,
      recommendation: 'Training can still be productive today, but recovery context suggests reducing unnecessary intensity or volume.',
      suggestedAction: scheduledWorkoutType === 'run' ? 'Keep the run easy and skip extra pace work.' : 'Keep the planned session focused and avoid adding conditioning.'
    }
  }

  if (scheduledWorkoutType === 'legs' && hadHardRunYesterday) {
    return {
      headline: 'Train legs as planned, but do not add extra running today.',
      recommendation:
        'Your recent run was faster than easy pace and today is lower-body training. This is acceptable if planned, but keep extra conditioning controlled.',
      suggestedAction: 'Complete the planned gym session and save the next run for its scheduled day.'
    }
  }

  if (recommendationType === 'train_but_control_extras') {
    return {
      headline: `Train ${scheduledLabel} as planned, but control extras.`,
      recommendation: `${readinessLabel} is a workable training state. Treat today's planned session as the main stressor.`,
      suggestedAction: 'Do the planned work and avoid adding unplanned mileage or intervals.'
    }
  }

  if (recommendationType === 'no_action_needed') {
    return {
      headline: 'No make-up work is needed today.',
      recommendation: 'You are only behind if a planned run day has already passed. Upcoming planned runs should not count against you.',
      suggestedAction: scheduledWorkoutType === 'run' ? 'Run as planned if readiness feels acceptable.' : "Stay with today's planned session."
    }
  }

  return {
    headline: `Train ${scheduledLabel} as planned.`,
    recommendation: "Today's training load looks acceptable for the scheduled session.",
    suggestedAction: 'Follow the plan and avoid adding work that was not planned.'
  }
}

function buildReasons({
  scheduledWorkoutType,
  readinessLabel,
  readinessScore,
  readinessMeaning,
  runPlanStatus,
  weeklyLoadContext,
  yesterdayRuns,
  tomorrowSchedule
}) {
  const reasons = [`Today is scheduled as ${formatWorkoutType(scheduledWorkoutType).toLowerCase()}.`]

  const hardRunYesterday = yesterdayRuns.find((run) => ['tempo', 'quality', 'quality-long'].includes(run.runType))
  if (hardRunYesterday) {
    reasons.push(`Yesterday's Strava run was classified as ${hardRunYesterday.runType} because it was faster than your easy pace.`)
  }

  if (readinessScore !== null && readinessScore !== undefined) {
    reasons.push(`Your readiness is ${readinessLabel.toLowerCase()}: ${readinessMeaning}`)
  }

  if (runPlanStatus.upcomingPlannedRuns.length > 0 && runPlanStatus.status !== 'behind') {
    reasons.push('Your next planned run is still upcoming.')
  } else if (runPlanStatus.status === 'behind') {
    reasons.push("A planned run day has already passed, but making it up should depend on today's session and readiness.")
  } else if (runPlanStatus.status === 'ahead_or_extra') {
    reasons.push('You have already completed more runs than were due by today.')
  }

  if (weeklyLoadContext.status === 'lower_but_week_not_over') {
    reasons.push('Your mileage is lower than last week, but the week is not over.')
  } else if (['moderate_increase', 'large_increase'].includes(weeklyLoadContext.status)) {
    reasons.push('Your current weekly mileage is trending above last week.')
  }

  if (normalizeWorkoutType(tomorrowSchedule?.workoutType) === 'run') {
    reasons.push('Tomorrow has a planned run, so there is no need to force extra running today.')
  }

  return Array.from(new Set(reasons)).slice(0, 5)
}

function buildTodayCoachNotes({ todayDecision, runPlanStatus, weeklyLoadContext, yesterdayRuns, relevantTodayWarnings }) {
  const notes = []
  const hardRunYesterday = yesterdayRuns.find((run) => ['tempo', 'quality', 'quality-long'].includes(run.runType))

  if (hardRunYesterday && todayDecision.scheduledWorkoutType === 'legs') {
    notes.push("Yesterday's run was faster than easy pace, so treat today's leg session as the main stressor and avoid extra intervals.")
  }

  if (runPlanStatus.status === 'behind') {
    notes.push('You are only behind if a planned run day has already passed. Do not force make-up mileage unless today is a planned run day and readiness is acceptable.')
  }

  if (runPlanStatus.status === 'ahead_or_extra') {
    notes.push("You have run more than planned so far. Extra easy running can be fine, but don't automatically progress next week's mileage again.")
  }

  if (weeklyLoadContext.status === 'large_increase') {
    notes.push('Mileage is already much higher than last week, so make today about executing the plan rather than adding extra volume.')
  } else if (weeklyLoadContext.status === 'lower_but_week_not_over') {
    notes.push('Mileage is lower right now, but the week is not over. Let the upcoming planned run do its job.')
  }

  if (todayDecision.readinessLabel === 'Loaded') {
    notes.push('Loaded is a normal training state. Train today, but keep optional conditioning controlled.')
  } else if (todayDecision.readinessLabel === 'Compromised') {
    notes.push('Today is better suited to modifying intensity or volume than stacking extra stress.')
  }

  if (relevantTodayWarnings.length && !notes.length) {
    notes.push('There is a planning note near today. Use it to adjust extras, not to avoid productive hard training.')
  }

  if (!notes.length) {
    notes.push('Today looks suitable for the planned session. Keep hard work intentional and skip unnecessary extras.')
  }

  return Array.from(new Set(notes)).slice(0, 4)
}

function buildTodayDecision({ userSettings, gymSchedule = [], stravaRuns = [], trainingLoadAnalysis = {} }) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const todayDayOfWeek = getTodayDayOfWeekMondayBased()
  const yesterdayDayOfWeek = shiftDay(todayDayOfWeek, -1)
  const tomorrowDayOfWeek = shiftDay(todayDayOfWeek, 1)
  const scheduleByDay = new Map(gymSchedule.map((day) => [day.dayOfWeek, day]))
  const todaySchedule = scheduleByDay.get(todayDayOfWeek) || { dayOfWeek: todayDayOfWeek, workoutType: 'rest' }
  const yesterdaySchedule = scheduleByDay.get(yesterdayDayOfWeek) || { dayOfWeek: yesterdayDayOfWeek, workoutType: 'rest' }
  const tomorrowSchedule = scheduleByDay.get(tomorrowDayOfWeek) || { dayOfWeek: tomorrowDayOfWeek, workoutType: 'rest' }
  const scheduledWorkoutType = normalizeWorkoutType(todaySchedule.workoutType)
  const yesterdayWorkoutType = normalizeWorkoutType(yesterdaySchedule.workoutType)
  const todayScoreEntry = (trainingLoadAnalysis.rollingFatigue?.scoresByDay || []).find(
    (score) => score.dayOfWeek === todayDayOfWeek
  )
  const readinessScore = todayScoreEntry?.rollingScore ?? null
  const { readinessLabel, readinessMeaning } = getReadinessFromScore(readinessScore)
  const todayRuns = stravaRuns.filter((run) => isSameLocalDay(run.activityDate, today))
  const yesterdayRuns = getClassifiedRunsForDate(trainingLoadAnalysis, yesterday)
  const runPlanStatus = buildRunPlanStatus({ gymSchedule, stravaRuns, todayDayOfWeek })
  const weeklyLoadContext = buildWeeklyLoadContext({
    weeklyRunStats: trainingLoadAnalysis.weeklyRunStats,
    todayDayOfWeek
  })
  const { relevantTodayWarnings, fullWeekWarnings } = splitWarnings(trainingLoadAnalysis.conflicts || [], todayDayOfWeek)
  const recommendationType = chooseRecommendationType({
    readinessLabel,
    scheduledWorkoutType,
    relevantTodayWarnings,
    todayRuns,
    yesterdayRuns,
    yesterdayWorkoutType,
    runPlanStatus
  })
  const recommendationText = buildRecommendationText({
    recommendationType,
    scheduledWorkoutType,
    readinessLabel,
    runPlanStatus,
    weeklyLoadContext,
    todayRuns,
    yesterdayRuns,
    yesterdayWorkoutType
  })
  const reasons = buildReasons({
    scheduledWorkoutType,
    readinessLabel,
    readinessScore,
    readinessMeaning,
    runPlanStatus,
    weeklyLoadContext,
    yesterdayRuns,
    tomorrowSchedule
  })
  const todayDecision = {
    date: formatLocalDate(today),
    dayOfWeek: todayDayOfWeek,
    dayLabel: getDayLabel(todayDayOfWeek),
    scheduledWorkoutType,
    readinessLabel,
    readinessScore,
    recommendationType,
    headline: recommendationText.headline,
    recommendation: recommendationText.recommendation,
    reasons,
    suggestedAction: recommendationText.suggestedAction
  }
  const coachNotes = buildTodayCoachNotes({
    todayDecision,
    runPlanStatus,
    weeklyLoadContext,
    yesterdayRuns,
    relevantTodayWarnings
  })

  return {
    todayDecision,
    runPlanStatus,
    weeklyLoadContext,
    relevantTodayWarnings,
    fullWeekWarnings,
    coachNotes
  }
}

module.exports = {
  buildTodayDecision,
  getDayLabel,
  getTodayDayOfWeekMondayBased
}
