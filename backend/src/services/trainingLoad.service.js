const DAY_LABELS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
}

const RUN_TYPE_RANK = {
  easy: 1,
  long: 2,
  tempo: 3,
  quality: 4,
  'quality-long': 5
}

const DECAY_WEIGHTS = [1, 0.75, 0.55, 0.35, 0.2]

function round(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  return Number(value.toFixed(decimals))
}

function normalizeWorkoutType(workoutType) {
  return String(workoutType || '').toLowerCase()
}

function isRunWorkout(workoutType) {
  return normalizeWorkoutType(workoutType) === 'run'
}

function isLegWorkout(workoutType) {
  return normalizeWorkoutType(workoutType) === 'legs'
}

function isGymWorkout(workoutType) {
  return ['push', 'pull', 'upper', 'legs', 'full_body'].includes(normalizeWorkoutType(workoutType))
}

function toDate(date) {
  return date instanceof Date ? new Date(date) : new Date(date)
}

function getStartOfWeek(date = new Date()) {
  const start = toDate(date)
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
  const value = toDate(date).getTime()
  return value >= toDate(start).getTime() && value <= toDate(end).getTime()
}

function getDayOfWeekMondayBased(date) {
  return toDate(date).getDay() || 7
}

function daysBetween(dateA, dateB) {
  const start = toDate(dateA)
  const end = toDate(dateB)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(Number(value)) && Number(value) > 0)
  if (!validValues.length) {
    return null
  }

  return validValues.reduce((total, value) => total + Number(value), 0) / validValues.length
}

function classifyStravaRun(run, userSettings = {}, recentRuns = []) {
  const averageRecentPace = average(recentRuns.map((recentRun) => recentRun.paceSecPerKm))
  const easyPace = userSettings.easyPaceSecPerKm || averageRecentPace
  const previousRuns = recentRuns.filter((recentRun) => new Date(recentRun.activityDate) < new Date(run.activityDate))
  const avgRecentDistance = average(recentRuns.map((recentRun) => recentRun.distanceKm)) || Number(run.distanceKm || 0)
  const recentLongestRun = previousRuns.reduce((longest, recentRun) => Math.max(longest, Number(recentRun.distanceKm || 0)), 0)
  const distanceKm = Number(run.distanceKm || 0)
  const paceSecPerKm = Number(run.paceSecPerKm || 0)
  const dayOfWeek = getDayOfWeekMondayBased(run.activityDate)
  const title = String(run.name || run.title || '').toLowerCase()
  const isUnusuallyLong = avgRecentDistance > 0 && distanceKm >= avgRecentDistance * 1.4
  const isLongRunSpike = recentLongestRun > 0 && distanceKm > recentLongestRun * 1.1
  const isQualityPace = easyPace && paceSecPerKm > 0 && paceSecPerKm <= easyPace * 0.88
  const isTempoPace = easyPace && paceSecPerKm > 0 && paceSecPerKm <= easyPace * 0.93

  let runType = 'easy'
  let reason = 'Run was treated as an easy effort based on recent pace and distance.'

  if (isQualityPace && isUnusuallyLong) {
    runType = 'quality-long'
    const fasterPercent = round((1 - paceSecPerKm / easyPace) * 100, 0)
    reason = `Run pace was ${fasterPercent}% faster than easy pace and distance was ${round((distanceKm / avgRecentDistance) * 100, 0)}% of recent average distance, so it was treated as a quality-long effort.`
  } else if (isQualityPace) {
    runType = 'quality'
    const fasterPercent = round((1 - paceSecPerKm / easyPace) * 100, 0)
    reason = `Run pace was ${fasterPercent}% faster than easy pace, so it was treated as a quality effort.`
  } else if (isTempoPace) {
    runType = 'tempo'
    const fasterPercent = round((1 - paceSecPerKm / easyPace) * 100, 0)
    reason = `Run pace was ${fasterPercent}% faster than easy pace, so it was treated as a tempo effort.`
  } else if (isUnusuallyLong) {
    runType = 'long'
    reason = `Run distance was ${round((distanceKm / avgRecentDistance) * 100, 0)}% of recent average distance, so it was treated as a long run.`
  } else if (title.includes('easy')) {
    reason = 'Run title included "easy", so it was treated as an easy effort.'
  }

  return {
    runId: run.id,
    activityDate: run.activityDate,
    dayOfWeek,
    distanceKm,
    paceSecPerKm: paceSecPerKm || null,
    runType,
    longRunSpike: isLongRunSpike,
    reason
  }
}

function calculateWeeklyRunStats(stravaRuns = [], gymSchedule = []) {
  const now = new Date()
  const currentWeekStart = getStartOfWeek(now)
  const currentWeekEnd = getEndOfWeek(now)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousWeekEnd = new Date(currentWeekStart)
  previousWeekEnd.setMilliseconds(previousWeekEnd.getMilliseconds() - 1)
  const last28DayStart = new Date(now)
  last28DayStart.setHours(0, 0, 0, 0)
  last28DayStart.setDate(last28DayStart.getDate() - 27)
  const chronicStart = new Date(currentWeekStart)
  chronicStart.setDate(chronicStart.getDate() - 28)

  const currentWeekRuns = stravaRuns.filter((run) => isDateInRange(run.activityDate, currentWeekStart, currentWeekEnd))
  const previousWeekRuns = stravaRuns.filter((run) => isDateInRange(run.activityDate, previousWeekStart, previousWeekEnd))
  const last28DayRuns = stravaRuns.filter((run) => isDateInRange(run.activityDate, last28DayStart, now))
  const chronicRuns = stravaRuns.filter((run) => isDateInRange(run.activityDate, chronicStart, previousWeekEnd))

  const currentWeekKm = currentWeekRuns.reduce((total, run) => total + Number(run.distanceKm || 0), 0)
  const previousWeekKm = previousWeekRuns.reduce((total, run) => total + Number(run.distanceKm || 0), 0)
  const last28DayKm = last28DayRuns.reduce((total, run) => total + Number(run.distanceKm || 0), 0)
  const chronicKm = chronicRuns.reduce((total, run) => total + Number(run.distanceKm || 0), 0)
  const plannedRunsThisWeek = gymSchedule.filter((day) => isRunWorkout(day.workoutType)).length
  const chronicLoad = chronicKm / 4

  return {
    currentWeekKm: round(currentWeekKm),
    previousWeekKm: round(previousWeekKm),
    last28DayKm: round(last28DayKm),
    currentWeekRuns: currentWeekRuns.length,
    plannedRunsThisWeek,
    mileageIncreasePercent: previousWeekKm > 0 ? round(((currentWeekKm - previousWeekKm) / previousWeekKm) * 100, 0) : null,
    acwr: chronicLoad > 0 ? round(currentWeekKm / chronicLoad, 2) : null
  }
}

function detectMileageSpike(weeklyRunStats, context = {}) {
  const conflicts = []
  const hasQualityRun = Boolean(context.hasQualityRun)
  const hasTrueRestDay = context.hasTrueRestDay !== false
  const hasHighRollingFatigue = Boolean(context.hasHighRollingFatigue)
  const hasOtherStressor = hasQualityRun || !hasTrueRestDay || hasHighRollingFatigue

  if (weeklyRunStats.mileageIncreasePercent >= 30) {
    conflicts.push({
      severity: hasOtherStressor ? 'high' : 'medium',
      code: 'MILEAGE_SPIKE',
      title: 'Mileage spike detected',
      message: `Your current week mileage is ${weeklyRunStats.mileageIncreasePercent}% higher than last week.`,
      suggestion: 'Your mileage increased this week. That can be productive, but avoid combining a large volume jump with extra intensity.'
    })
  } else if (weeklyRunStats.mileageIncreasePercent >= 15) {
    conflicts.push({
      severity: hasQualityRun ? 'medium' : 'low',
      code: 'MILEAGE_SPIKE',
      title: 'Workload spike detected',
      message: `Your current week mileage is ${weeklyRunStats.mileageIncreasePercent}% higher than last week.`,
      suggestion: hasQualityRun
        ? 'Keep the next hard effort conservative while your volume is up.'
        : 'This is a training-load flag rather than a major warning if the week is otherwise controlled.'
    })
  }

  const hasMileageConflict = conflicts.some((conflict) => conflict.code === 'MILEAGE_SPIKE')

  if (weeklyRunStats.acwr >= 1.5 && (!hasMileageConflict || hasOtherStressor)) {
    conflicts.push({
      severity: hasOtherStressor ? 'high' : 'medium',
      code: 'ACWR_SPIKE',
      title: 'Acute workload spike detected',
      message: `Your acute-to-chronic workload ratio is ${weeklyRunStats.acwr}, which suggests a sharp short-term running load increase.`,
      suggestion: 'Treat ACWR as a planning heuristic and avoid stacking hard run intensity with this load.'
    })
  } else if (weeklyRunStats.acwr >= 1.3 && !hasMileageConflict) {
    conflicts.push({
      severity: 'medium',
      code: 'ACWR_SPIKE',
      title: 'Acute workload increase detected',
      message: `Your acute-to-chronic workload ratio is ${weeklyRunStats.acwr}, which suggests elevated short-term running load.`,
      suggestion: 'Keep upcoming sessions easy until workload settles.'
    })
  }

  return conflicts
}

function buildWeeklyActivityMap({ gymSchedule = [], classifiedRuns = [] }) {
  const scheduleByDay = new Map(gymSchedule.map((day) => [day.dayOfWeek, day]))

  return [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
    const scheduledDay = scheduleByDay.get(dayOfWeek) || { dayOfWeek, workoutType: 'rest' }
    const plannedWorkoutType = normalizeWorkoutType(scheduledDay.workoutType)
    const actualRuns = classifiedRuns.filter((run) => run.dayOfWeek === dayOfWeek)
    const hasActualRun = actualRuns.length > 0
    const plannedRun = isRunWorkout(plannedWorkoutType)
    const hardestRun = actualRuns.reduce((hardest, run) => {
      if (!hardest || RUN_TYPE_RANK[run.runType] > RUN_TYPE_RANK[hardest.runType]) {
        return run
      }

      return hardest
    }, null)

    let primaryActivityType = 'rest'
    if (hasActualRun && isGymWorkout(plannedWorkoutType)) {
      primaryActivityType = 'mixed'
    } else if (hasActualRun || plannedRun) {
      primaryActivityType = 'run'
    } else if (isGymWorkout(plannedWorkoutType)) {
      primaryActivityType = 'gym'
    }

    return {
      dayOfWeek,
      label: DAY_LABELS[dayOfWeek],
      plannedWorkoutType,
      actualRuns,
      hasActualRun,
      plannedRun,
      primaryActivityType,
      inferredRunType: hardestRun?.runType || scheduledDay.plannedRunType || (plannedRun ? 'easy' : null)
    }
  })
}

function getRunScore(runType) {
  return {
    easy: 2,
    steady: 3,
    long: 4,
    tempo: 4,
    intervals: 5,
    hybrid_quality: 5,
    quality: 5,
    'quality-long': 6
  }[runType] || 0
}

function getGymScore(workoutType) {
  return {
    push: 2,
    pull: 2,
    upper: 2,
    legs: 5,
    full_body: 4
  }[normalizeWorkoutType(workoutType)] || 0
}

function getDayLoad(day) {
  const reasons = []
  const gymScore = isGymWorkout(day.plannedWorkoutType) ? getGymScore(day.plannedWorkoutType) : 0
  const runScore = getRunScore(day.inferredRunType)

  if (day.plannedWorkoutType === 'legs') {
    reasons.push('Leg day contributes high lower-body fatigue.')
  } else if (day.plannedWorkoutType === 'full_body') {
    reasons.push('Full-body training contributes moderate total-body fatigue.')
  } else if (gymScore > 0) {
    reasons.push(`${DAY_LABELS[day.dayOfWeek]} gym work contributes light-to-moderate training load.`)
  }

  if (day.inferredRunType === 'quality') {
    reasons.push('Quality run contributes high running load.')
  } else if (day.inferredRunType === 'quality-long') {
    reasons.push('Quality-long run contributes high running and sustained distance load.')
  } else if (day.inferredRunType === 'tempo') {
    reasons.push('Tempo run contributes moderate-to-high running load.')
  } else if (day.inferredRunType === 'long') {
    reasons.push('Long run contributes sustained running load.')
  } else if (day.inferredRunType === 'easy') {
    reasons.push('Easy run contributes light running load.')
  }

  if (!gymScore && !runScore) {
    reasons.push('True rest day contributes no training load.')
  }

  return {
    score: Math.min(gymScore + runScore, 7),
    reasons
  }
}

function classifyRollingScore(score) {
  if (score > 11) {
    return 'high'
  }

  if (score >= 7) {
    return 'moderate'
  }

  return 'low'
}

function calculateRollingFatigue(weeklyActivityMap) {
  const dayLoads = weeklyActivityMap.map((day) => ({
    day,
    load: getDayLoad(day)
  }))

  const scoresByDay = dayLoads.map(({ day, load }, index) => {
    const rollingScore = DECAY_WEIGHTS.reduce((total, weight, offset) => {
      const previous = dayLoads[index - offset]
      return total + (previous ? previous.load.score * weight : 0)
    }, 0)

    return {
      dayOfWeek: day.dayOfWeek,
      label: day.label,
      loadScore: load.score,
      rollingScore: round(rollingScore, 1),
      classification: classifyRollingScore(rollingScore),
      reasons: load.reasons
    }
  })

  const todayDayOfWeek = getDayOfWeekMondayBased(new Date())
  const today = scoresByDay.find((score) => score.dayOfWeek === todayDayOfWeek) || scoresByDay[scoresByDay.length - 1]

  return {
    todayScore: today?.rollingScore || 0,
    classification: today?.classification || 'low',
    scoresByDay
  }
}

function previousDay(dayOfWeek) {
  return dayOfWeek === 1 ? 7 : dayOfWeek - 1
}

function nextDay(dayOfWeek) {
  return dayOfWeek === 7 ? 1 : dayOfWeek + 1
}

function conflictKey(conflict) {
  return `${conflict.code}:${(conflict.affectedDays || []).join(',')}:${conflict.message}`
}

function isHardRunType(runType) {
  return ['tempo', 'intervals', 'hybrid_quality', 'quality', 'quality-long'].includes(runType)
}

function hasMileageSpike(weeklyRunStats) {
  return Number(weeklyRunStats?.mileageIncreasePercent || 0) >= 30 || Number(weeklyRunStats?.acwr || 0) >= 1.3
}

function detectScheduleConflicts(weeklyActivityMap, rollingFatigue, weeklyRunStats = null) {
  const conflicts = []
  const dayByNumber = new Map(weeklyActivityMap.map((day) => [day.dayOfWeek, day]))
  const rollingByDay = new Map(rollingFatigue.scoresByDay.map((score) => [score.dayOfWeek, score]))
  const trueRestDays = weeklyActivityMap.filter((day) => day.plannedWorkoutType === 'rest' && !day.hasActualRun)
  const hasTrueRestDay = trueRestDays.length > 0
  const mileageSpike = hasMileageSpike(weeklyRunStats)

  weeklyActivityMap.forEach((day) => {
    const hasActualHardRun = day.actualRuns.some((run) => isHardRunType(run.runType))

    if (hasActualHardRun) {
      const nearbyLegDay = [previousDay(day.dayOfWeek), nextDay(day.dayOfWeek)]
        .map((dayNumber) => dayByNumber.get(dayNumber))
        .find((nearbyDay) => nearbyDay && isLegWorkout(nearbyDay.plannedWorkoutType))

      if (nearbyLegDay) {
        const rollingScore = rollingByDay.get(day.dayOfWeek)
        const elevatedContext =
          day.inferredRunType === 'quality-long' ||
          rollingScore?.classification === 'high' ||
          mileageSpike ||
          !hasTrueRestDay

        conflicts.push({
          severity: elevatedContext && day.inferredRunType !== 'tempo' ? 'high' : 'medium',
          code: 'QUALITY_RUN_NEAR_LEGS',
          title: 'Quality run near leg day',
          message: `Your ${day.inferredRunType} run was completed one day ${nearbyLegDay.dayOfWeek > day.dayOfWeek ? 'before' : 'after'} leg day.`,
          suggestion: elevatedContext
            ? 'Quality work is close to leg day. Because recent load is elevated, consider reducing either run intensity or lower-body volume.'
            : 'This can be acceptable when planned, but keep the nearby lower-body work controlled.',
          affectedDays: [day.dayOfWeek, nearbyLegDay.dayOfWeek].sort((a, b) => a - b)
        })
      }
    }

    const yesterday = dayByNumber.get(previousDay(day.dayOfWeek))
    if (day.actualRuns.some((run) => run.runType === 'long') && yesterday && isLegWorkout(yesterday.plannedWorkoutType)) {
      const hasLongRunSpike = day.actualRuns.some((run) => run.longRunSpike)
      conflicts.push({
        severity: hasLongRunSpike || !hasTrueRestDay ? 'high' : 'medium',
        code: 'LONG_RUN_AFTER_LEGS',
        title: 'Long run after leg day',
        message: 'Your long run was completed the day after leg day.',
        suggestion: 'Long running after leg day adds lower-body fatigue. This is not automatically bad, but it may compromise recovery if volume is also increasing.',
        affectedDays: [yesterday.dayOfWeek, day.dayOfWeek]
      })
    }

    if (['legs', 'full_body'].includes(day.plannedWorkoutType) && ['tempo', 'quality', 'quality-long', 'long'].includes(day.inferredRunType)) {
      conflicts.push({
        severity: 'high',
        code: 'MIXED_HIGH_LOAD_DAY',
        title: 'Mixed high-load day',
        message: `${day.label} combines ${day.plannedWorkoutType === 'legs' ? 'leg day' : 'full-body training'} with a ${day.inferredRunType} run.`,
        suggestion: 'Separate demanding run work from heavy gym work where possible.',
        affectedDays: [day.dayOfWeek]
      })
    }
  })

  rollingFatigue.scoresByDay
    .filter((score) => score.classification === 'high')
    .forEach((score) => {
      const day = dayByNumber.get(score.dayOfWeek)
      const coincidesWithDemandingWork =
        day && (['tempo', 'intervals', 'hybrid_quality', 'quality', 'quality-long'].includes(day.inferredRunType) || isLegWorkout(day.plannedWorkoutType))
      conflicts.push({
        severity: coincidesWithDemandingWork ? 'high' : 'medium',
        code: 'HIGH_ROLLING_FATIGUE',
        title: 'High rolling fatigue warning',
        message: `${score.label} has a high rolling fatigue score of ${score.rollingScore}.`,
        suggestion: 'Use this as a planning risk flag and keep nearby training conservative.',
        affectedDays: [score.dayOfWeek]
      })
    })

  if (!trueRestDays.length) {
    const hasHighRollingFatigue = rollingFatigue.scoresByDay.some((score) => score.classification === 'high')
    conflicts.push({
      severity: hasHighRollingFatigue ? 'high' : 'medium',
      code: 'NO_TRUE_REST_DAY',
      title: 'No true rest day detected',
      message: 'This week does not include a scheduled rest day without an actual run.',
      suggestion: 'No true rest day may be acceptable for a short block, but it should not become the default structure.',
      affectedDays: weeklyActivityMap.map((day) => day.dayOfWeek)
    })
  }

  weeklyActivityMap
    .filter((day) => day.plannedWorkoutType === 'rest' && day.hasActualRun)
    .forEach((day) => {
      conflicts.push({
        severity: hasTrueRestDay ? 'low' : 'high',
        code: 'REST_DAY_USED_FOR_RUN',
        title: 'Run on scheduled rest day',
        message: `${day.label} was scheduled as rest but includes an actual Strava run.`,
        suggestion: 'Keep the next session easy or restore a true rest day elsewhere.',
        affectedDays: [day.dayOfWeek]
      })
    })

  if (weeklyRunStats && weeklyRunStats.plannedRunsThisWeek > weeklyRunStats.currentWeekRuns) {
    conflicts.push({
      severity: 'low',
      code: 'MISSED_PLANNED_RUNS',
      title: 'Missed planned runs',
      message: `You planned ${weeklyRunStats.plannedRunsThisWeek} runs but completed ${weeklyRunStats.currentWeekRuns}.`,
      suggestion: 'Avoid increasing next week mileage too aggressively to make up missed distance.'
    })
  } else if (weeklyRunStats && weeklyRunStats.currentWeekRuns > weeklyRunStats.plannedRunsThisWeek) {
    const extraRuns = weeklyRunStats.currentWeekRuns - weeklyRunStats.plannedRunsThisWeek
    const hasQualityRun = weeklyActivityMap.some((day) => ['quality', 'quality-long'].includes(day.inferredRunType))
    conflicts.push({
      severity: extraRuns >= 2 && mileageSpike ? 'high' : hasQualityRun ? 'medium' : 'low',
      code: 'EXTRA_RUNS',
      title: 'Extra unplanned runs',
      message: `You completed ${weeklyRunStats.currentWeekRuns} runs but planned ${weeklyRunStats.plannedRunsThisWeek}.`,
      suggestion: 'Extra easy running can be fine, but next week should not automatically progress volume again.'
    })
  }

  return Array.from(new Map(conflicts.map((conflict) => [conflictKey(conflict), conflict])).values())
}

function calculateOverallRisk(conflicts, rollingFatigue) {
  const totalPoints = conflicts.reduce((total, conflict) => {
    const points = { low: 1, moderate: 2, medium: 2, high: 4 }[conflict.severity] || 0
    return total + points
  }, 0)
  const codes = new Set(conflicts.map((conflict) => conflict.code))
  const overrideHigh =
    codes.has('MIXED_HIGH_LOAD_DAY') ||
    (codes.has('NO_TRUE_REST_DAY') && rollingFatigue.classification === 'high') ||
    (codes.has('MILEAGE_SPIKE') && codes.has('HIGH_ROLLING_FATIGUE') && codes.has('QUALITY_RUN_NEAR_LEGS')) ||
    conflicts.some((conflict) => conflict.code === 'EXTRA_RUNS' && conflict.severity === 'high')

  if (overrideHigh || totalPoints >= 6) {
    return 'high'
  }

  if (totalPoints >= 3 || rollingFatigue.classification === 'moderate') {
    return 'moderate'
  }

  return 'low'
}

function generateCoachNotes({ weeklyRunStats, runClassifications, rollingFatigue, conflicts }) {
  const notes = []
  const hasConflict = (code) => conflicts.some((conflict) => conflict.code === code)

  if (!conflicts.length) {
    notes.push('Your current week looks balanced with no major fatigue conflicts detected.')
  }

  if (hasConflict('MILEAGE_SPIKE') || hasConflict('ACWR_SPIKE')) {
    notes.push('Your running volume increased this week, so avoid stacking intensity on top of extra distance.')
  }

  if (hasConflict('EXTRA_RUNS')) {
    notes.push('You completed more runs than planned. Consider keeping next week progression conservative.')
  }

  if (hasConflict('MISSED_PLANNED_RUNS')) {
    notes.push('You completed fewer runs than planned. Avoid increasing next week mileage too aggressively.')
  }

  if (runClassifications.some((run) => ['quality', 'quality-long'].includes(run.runType))) {
    notes.push('At least one recent Strava run was faster than your easy pace, so it was treated as a quality effort.')
  }

  if (hasConflict('NO_TRUE_REST_DAY')) {
    notes.push('No true rest day was detected this week. Hybrid training generally benefits from at least one low-load day.')
  }

  if (rollingFatigue.classification === 'high') {
    notes.push('Today has a high rolling fatigue score, so treat hard training as a planning risk rather than a default.')
  } else if (rollingFatigue.classification === 'moderate') {
    notes.push('Today has moderate rolling fatigue, so keep any extra work controlled.')
  }

  if (weeklyRunStats.mileageIncreasePercent !== null && weeklyRunStats.mileageIncreasePercent < 0) {
    notes.push('Your current week mileage is below last week, which may help recovery if fatigue has been accumulating.')
  }

  return Array.from(new Set(notes))
}

function getPlannedSchedule(gymSchedule, generatedPlan) {
  if (!generatedPlan) {
    return gymSchedule
  }

  if (Array.isArray(generatedPlan)) {
    return generatedPlan
  }

  if (Array.isArray(generatedPlan.days)) {
    return generatedPlan.days
  }

  if (Array.isArray(generatedPlan.planJson?.days)) {
    return generatedPlan.planJson.days
  }

  if (Array.isArray(generatedPlan.planJson?.schedule)) {
    return generatedPlan.planJson.schedule
  }

  if (Array.isArray(generatedPlan.planJson?.planDays)) {
    return generatedPlan.planJson.planDays.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      workoutType: day.plannedRun ? 'run' : day.scheduledWorkoutType,
      plannedRunType: day.plannedRun?.runType || null
    }))
  }

  if (Array.isArray(generatedPlan.planJson)) {
    return generatedPlan.planJson
  }

  return gymSchedule
}

function analyzeTrainingLoad({ userSettings = {}, gymSchedule = [], stravaRuns = [], generatedPlan = null }) {
  const plannedSchedule = getPlannedSchedule(gymSchedule, generatedPlan)
  const sortedRuns = [...stravaRuns].sort((a, b) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime())
  const runClassifications = sortedRuns.map((run) => classifyStravaRun(run, userSettings, sortedRuns))
  const weeklyRunStats = calculateWeeklyRunStats(sortedRuns, plannedSchedule)
  const currentWeekStart = getStartOfWeek(new Date())
  const currentWeekEnd = getEndOfWeek(new Date())
  const currentWeekClassifications = runClassifications.filter((run) =>
    isDateInRange(run.activityDate, currentWeekStart, currentWeekEnd)
  )
  const weeklyActivityMap = buildWeeklyActivityMap({
    gymSchedule: plannedSchedule,
    classifiedRuns: currentWeekClassifications
  })
  const rollingFatigue = calculateRollingFatigue(weeklyActivityMap)
  const hasTrueRestDay = weeklyActivityMap.some((day) => day.plannedWorkoutType === 'rest' && !day.hasActualRun)
  const hasQualityRun = currentWeekClassifications.some((run) => ['tempo', 'intervals', 'hybrid_quality', 'quality', 'quality-long'].includes(run.runType))
  const hasHighRollingFatigue = rollingFatigue.scoresByDay.some((score) => score.classification === 'high')
  const conflicts = [
    ...detectMileageSpike(weeklyRunStats, {
      hasQualityRun,
      hasTrueRestDay,
      hasHighRollingFatigue
    }),
    ...detectScheduleConflicts(weeklyActivityMap, rollingFatigue, weeklyRunStats)
  ]
  const riskLevel = calculateOverallRisk(conflicts, rollingFatigue)
  const coachNotes = generateCoachNotes({
    weeklyRunStats,
    runClassifications,
    rollingFatigue,
    conflicts
  })

  return {
    riskLevel,
    weeklyRunStats,
    rollingFatigue,
    runClassifications,
    conflicts,
    coachNotes
  }
}

module.exports = {
  analyzeTrainingLoad,
  buildWeeklyActivityMap,
  calculateOverallRisk,
  calculateRollingFatigue,
  calculateWeeklyRunStats,
  classifyStravaRun,
  daysBetween,
  detectMileageSpike,
  detectScheduleConflicts,
  generateCoachNotes,
  getDayLoad,
  getDayOfWeekMondayBased,
  getEndOfWeek,
  getStartOfWeek,
  isDateInRange
}
