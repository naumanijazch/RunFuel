const prisma = require('../lib/prisma')
const {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchAthleteActivities,
  getValidStravaAccessToken,
  readStravaState
} = require('../services/stravaService')

function serializeRun(run) {
  if (!run) {
    return null
  }

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

function weekBounds(date = new Date()) {
  const start = new Date(date)
  const day = start.getDay() || 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + 1)

  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  return { start, end }
}

function frontendRedirect(path) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  return `${frontendUrl}${path}`
}

function connect(req, res, next) {
  try {
    return res.redirect(buildAuthorizeUrl(req.user.id))
  } catch (error) {
    next(error)
  }
}

async function callback(req, res, next) {
  try {
    const { code, error, state } = req.query

    if (error) {
      return res.redirect(frontendRedirect(`/dashboard?strava=error&reason=${encodeURIComponent(error)}`))
    }

    if (!code || !state) {
      return res.redirect(frontendRedirect('/dashboard?strava=error'))
    }

    const userId = readStravaState(state)
    const token = await exchangeCodeForToken(code)

    await prisma.stravaConnection.upsert({
      where: { userId },
      create: {
        userId,
        stravaAthleteId: String(token.athlete.id),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(token.expires_at * 1000)
      },
      update: {
        stravaAthleteId: String(token.athlete.id),
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(token.expires_at * 1000)
      }
    })

    return res.redirect(frontendRedirect('/dashboard?strava=connected'))
  } catch (error) {
    next(error)
  }
}

async function status(req, res, next) {
  try {
    const connection = await prisma.stravaConnection.findUnique({
      where: { userId: req.user.id },
      select: { stravaAthleteId: true, expiresAt: true }
    })

    return res.json({
      connected: Boolean(connection),
      stravaAthleteId: connection?.stravaAthleteId,
      expiresAt: connection?.expiresAt
    })
  } catch (error) {
    next(error)
  }
}

async function sync(req, res, next) {
  try {
    const accessToken = await getValidStravaAccessToken(req.user.id)
    const activities = await fetchAthleteActivities(accessToken)
    const runs = activities.filter((activity) => activity.type === 'Run')

    const savedRuns = await Promise.all(
      runs
        .filter((activity) => Number(activity.distance) > 0)
        .map((activity) => {
          const distanceKm = activity.distance / 1000

          return prisma.run.upsert({
            where: { stravaActivityId: String(activity.id) },
            create: {
              userId: req.user.id,
              stravaActivityId: String(activity.id),
              name: activity.name || 'Strava Run',
              activityDate: new Date(activity.start_date),
              distanceKm,
              movingTimeSeconds: activity.moving_time,
              paceSecPerKm: Math.round(activity.moving_time / distanceKm),
              averageHeartrate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null
            },
            update: {
              name: activity.name || 'Strava Run',
              activityDate: new Date(activity.start_date),
              distanceKm,
              movingTimeSeconds: activity.moving_time,
              paceSecPerKm: Math.round(activity.moving_time / distanceKm),
              averageHeartrate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null
            }
          })
        })
    )

    return res.json({ importedCount: savedRuns.length })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message })
    }

    next(error)
  }
}

async function runs(req, res, next) {
  try {
    const recentRuns = await prisma.run.findMany({
      where: { userId: req.user.id },
      orderBy: { activityDate: 'desc' },
      take: 20
    })

    return res.json({ runs: recentRuns.map(serializeRun) })
  } catch (error) {
    next(error)
  }
}

async function summary(req, res, next) {
  try {
    const { start, end } = weekBounds()
    const [weekRuns, latestRun, recentRuns] = await Promise.all([
      prisma.run.findMany({
        where: {
          userId: req.user.id,
          activityDate: { gte: start, lt: end }
        },
        orderBy: { activityDate: 'desc' }
      }),
      prisma.run.findFirst({
        where: { userId: req.user.id },
        orderBy: { activityDate: 'desc' }
      }),
      prisma.run.findMany({
        where: { userId: req.user.id },
        orderBy: { activityDate: 'desc' },
        take: 10
      })
    ])

    const weeklyDistanceKm = weekRuns.reduce((total, run) => total + run.distanceKm, 0)
    const totalMovingSeconds = weekRuns.reduce((total, run) => total + run.movingTimeSeconds, 0)
    const averagePaceSecPerKm = weeklyDistanceKm > 0 ? Math.round(totalMovingSeconds / weeklyDistanceKm) : null

    return res.json({
      weeklyDistanceKm,
      totalRunsThisWeek: weekRuns.length,
      averagePaceSecPerKm,
      latestRun: serializeRun(latestRun),
      recentRuns: recentRuns.map(serializeRun)
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { callback, connect, runs, status, summary, sync }
