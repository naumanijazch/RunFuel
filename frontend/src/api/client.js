import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
})

export async function fetchSettings() {
  const response = await api.get('/settings')
  return response.data.settings
}

export async function saveSettings(settings) {
  const response = await api.put('/settings', settings)
  return response.data.settings
}

export async function fetchGymSchedule() {
  const response = await api.get('/gym-schedule')
  return response.data.schedule
}

export async function saveGymSchedule(schedule) {
  const response = await api.put('/gym-schedule', schedule)
  return response.data.schedule
}

export async function fetchCurrentNutritionTarget() {
  const response = await api.get('/nutrition-target/current')
  return response.data.nutritionTarget
}

export async function saveNutritionTarget(target) {
  const response = await api.post('/nutrition-target', target)
  return response.data.nutritionTarget
}

export async function fetchLatestWeight() {
  const response = await api.get('/weight/latest')
  return response.data.weightEntry
}

export async function saveWeightEntry(entry) {
  const response = await api.post('/weight', entry)
  return response.data.weightEntry
}

export async function fetchStravaStatus() {
  const response = await api.get('/strava/status')
  return response.data
}

export async function fetchStravaSummary() {
  const response = await api.get('/strava/summary')
  return response.data
}

export async function fetchStravaRuns() {
  const response = await api.get('/strava/runs')
  return response.data.runs
}

export async function syncStravaRuns() {
  const response = await api.post('/strava/sync')
  return response.data
}
