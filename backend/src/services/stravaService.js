const axios = require('axios')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities'

function requireStravaConfig() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI } = process.env

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REDIRECT_URI) {
    throw new Error('Strava OAuth environment variables are required')
  }

  return { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI }
}

function createStravaState(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required')
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' })
}

function readStravaState(state) {
  const payload = jwt.verify(state, process.env.JWT_SECRET)
  return payload.userId
}

function buildAuthorizeUrl(userId) {
  const { STRAVA_CLIENT_ID, STRAVA_REDIRECT_URI } = requireStravaConfig()
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state: createStravaState(userId)
  })

  return `${STRAVA_AUTH_URL}?${params.toString()}`
}

async function exchangeCodeForToken(code) {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = requireStravaConfig()
  const response = await axios.post(STRAVA_TOKEN_URL, {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code'
  })

  return response.data
}

async function refreshStravaToken(connection) {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = requireStravaConfig()
  const response = await axios.post(STRAVA_TOKEN_URL, {
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    refresh_token: connection.refreshToken,
    grant_type: 'refresh_token'
  })

  const token = response.data

  await prisma.stravaConnection.update({
    where: { userId: connection.userId },
    data: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: new Date(token.expires_at * 1000)
    }
  })

  return token.access_token
}

async function getValidStravaAccessToken(userId) {
  const connection = await prisma.stravaConnection.findUnique({ where: { userId } })

  if (!connection) {
    const error = new Error('Strava is not connected')
    error.status = 404
    throw error
  }

  const refreshBufferMs = 60 * 1000
  if (connection.expiresAt.getTime() > Date.now() + refreshBufferMs) {
    return connection.accessToken
  }

  return refreshStravaToken(connection)
}

async function fetchAthleteActivities(accessToken) {
  const response = await axios.get(STRAVA_ACTIVITIES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 30 }
  })

  return response.data
}

module.exports = {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchAthleteActivities,
  getValidStravaAccessToken,
  readStravaState
}
