import axios from 'axios'

const TOKEN_KEY = 'runfuel_token'

export const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  withCredentials: true
})

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
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
