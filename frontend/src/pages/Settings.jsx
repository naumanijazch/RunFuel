import { useEffect, useMemo, useState } from 'react'
import {
  fetchCurrentNutritionTarget,
  fetchGymSchedule,
  fetchLatestWeight,
  fetchSettings,
  saveGymSchedule,
  saveNutritionTarget,
  saveSettings,
  saveWeightEntry
} from '../api/client'

const days = [
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
  { dayOfWeek: 7, label: 'Sunday' }
]

const workoutOptions = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' },
  { value: 'upper', label: 'Upper' },
  { value: 'full_body', label: 'Full body' },
  { value: 'easy_run', label: 'Easy run' },
  { value: 'quality_run', label: 'Quality/interval run' },
  { value: 'rest', label: 'Rest' }
]

const goalOptions = [
  { value: '5k', label: '5K' },
  { value: '10k', label: '10K' },
  { value: 'general_endurance', label: 'General endurance' },
  { value: 'hybrid_conditioning', label: 'Hybrid conditioning' }
]

const defaultSettings = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  paceUnit: 'min_per_km',
  easyPaceSecPerKm: '',
  goalType: 'general_endurance'
}

const defaultSchedule = days.map((day) => ({
  dayOfWeek: day.dayOfWeek,
  workoutType: day.dayOfWeek === 7 ? 'rest' : 'easy_run'
}))

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = formatDateInput(new Date())

function currentWeekStart() {
  const date = new Date()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return formatDateInput(date)
}

function secondsToPace(seconds) {
  if (!seconds) {
    return ''
  }

  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function paceToSeconds(value) {
  const trimmed = String(value).trim()

  if (!trimmed) {
    return null
  }

  if (trimmed.includes(':')) {
    const [minutes, seconds = '0'] = trimmed.split(':')
    return Number(minutes) * 60 + Number(seconds)
  }

  return Math.round(Number(trimmed) * 60)
}

function kgToDisplay(weightKg, unit) {
  if (!weightKg) {
    return ''
  }

  return unit === 'lbs' ? (weightKg * 2.2046226218).toFixed(1) : Number(weightKg).toFixed(1)
}

function displayToKg(weight, unit) {
  const value = Number(weight)
  return unit === 'lbs' ? value / 2.2046226218 : value
}

function convertPaceDisplay(value, fromUnit, toUnit) {
  const seconds = paceToSeconds(value)

  if (!seconds || fromUnit === toUnit) {
    return value
  }

  const secPerKm = fromUnit === 'min_per_mile' ? seconds / 1.609344 : seconds
  const displaySeconds = toUnit === 'min_per_mile' ? secPerKm * 1.609344 : secPerKm
  return secondsToPace(displaySeconds)
}

function convertWeightDisplay(value, fromUnit, toUnit) {
  if (!value || fromUnit === toUnit) {
    return value
  }

  const kg = displayToKg(value, fromUnit)
  return kgToDisplay(kg, toUnit)
}

function apiMessage(error) {
  const message = error?.response?.data?.message
  const errors = error?.response?.data?.errors

  if (errors) {
    const firstError = Object.values(errors).flat().find(Boolean)
    return firstError || message || 'Please check the form values.'
  }

  return message || 'Something went wrong.'
}

function Field({ children, label, required = false }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-heading">
      <span className="flex items-center gap-1">
        {label}
        {required ? <span className="text-danger" aria-label="required">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function Section({ children, message, onSubmit, saving, title }) {
  return (
    <form
      className="rounded-lg border-2 border-border-panel bg-panel-strong p-4 shadow-control"
      onSubmit={onSubmit}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        <button
          className="ml-auto rounded border-2 border-border-strong bg-action px-4 py-2 text-sm font-bold text-action-text hover:bg-action-hover disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {children}
      {message ? (
        <p className={`mt-3 text-sm font-semibold ${message.type === 'error' ? 'text-danger' : 'text-muted'}`}>
          {message.text}
        </p>
      ) : null}
    </form>
  )
}

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings)
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [nutrition, setNutrition] = useState({
    weekStartDate: currentWeekStart(),
    calories: '',
    proteinG: '',
    carbsG: '',
    fatG: ''
  })
  const [weight, setWeight] = useState({ date: today, currentWeight: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [messages, setMessages] = useState({})

  const paceLabel = settings.paceUnit === 'min_per_mile' ? 'Easy pace (min/mile)' : 'Easy pace (min/km)'
  const weightLabel = `Current weight (${settings.weightUnit})`

  const inputClass =
    'rounded border-2 border-border-panel bg-input px-3 py-2 text-sm text-text-app outline-none focus:border-focus'

  const selectClass = `${inputClass} cursor-pointer`

  const paceMultiplier = useMemo(
    () => (settings.paceUnit === 'min_per_mile' ? 1.609344 : 1),
    [settings.paceUnit]
  )

  useEffect(() => {
    async function loadSettingsPage() {
      try {
        const [loadedSettings, loadedSchedule, loadedNutrition, loadedWeight] = await Promise.all([
          fetchSettings(),
          fetchGymSchedule(),
          fetchCurrentNutritionTarget(),
          fetchLatestWeight()
        ])

        const loadedPaceMultiplier = loadedSettings.paceUnit === 'min_per_mile' ? 1.609344 : 1

        setSettings({
          ...loadedSettings,
          easyPaceSecPerKm: secondsToPace(
            loadedSettings.easyPaceSecPerKm ? loadedSettings.easyPaceSecPerKm * loadedPaceMultiplier : null
          )
        })
        setSchedule(loadedSchedule)
        setNutrition({
          weekStartDate: loadedNutrition?.weekStartDate || currentWeekStart(),
          calories: loadedNutrition?.calories ?? '',
          proteinG: loadedNutrition?.proteinG ?? '',
          carbsG: loadedNutrition?.carbsG ?? '',
          fatG: loadedNutrition?.fatG ?? ''
        })
        setWeight({
          date: loadedWeight?.date || today,
          currentWeight: kgToDisplay(loadedWeight?.weightKg, loadedSettings.weightUnit)
        })
      } catch (error) {
        setMessages((current) => ({
          ...current,
          page: { type: 'error', text: apiMessage(error) }
        }))
      } finally {
        setLoading(false)
      }
    }

    loadSettingsPage()
  }, [])

  function handleWeightUnitChange(nextUnit) {
    setWeight((current) => ({
      ...current,
      currentWeight: convertWeightDisplay(current.currentWeight, settings.weightUnit, nextUnit)
    }))
    setSettings((current) => ({ ...current, weightUnit: nextUnit }))
  }

  function handlePaceUnitChange(nextUnit) {
    setSettings((current) => ({
      ...current,
      paceUnit: nextUnit,
      easyPaceSecPerKm: convertPaceDisplay(current.easyPaceSecPerKm, current.paceUnit, nextUnit)
    }))
  }

  function setMessage(section, type, text) {
    setMessages((current) => ({ ...current, [section]: { type, text } }))
  }

  async function handleSettingsSave(event) {
    event.preventDefault()
    setSaving('settings')

    try {
      const paceSeconds = paceToSeconds(settings.easyPaceSecPerKm)
      const saved = await saveSettings({
        ...settings,
        easyPaceSecPerKm: paceSeconds ? Math.round(paceSeconds / paceMultiplier) : null
      })

      setSettings({
        ...saved,
        easyPaceSecPerKm: secondsToPace(saved.easyPaceSecPerKm ? saved.easyPaceSecPerKm * paceMultiplier : null)
      })
      setMessage('settings', 'success', 'Athlete preferences saved.')
    } catch (error) {
      setMessage('settings', 'error', apiMessage(error))
    } finally {
      setSaving('')
    }
  }

  async function handleScheduleSave(event) {
    event.preventDefault()
    setSaving('schedule')

    try {
      const saved = await saveGymSchedule(schedule)
      setSchedule(saved)
      setMessage('schedule', 'success', 'Weekly gym schedule saved.')
    } catch (error) {
      setMessage('schedule', 'error', apiMessage(error))
    } finally {
      setSaving('')
    }
  }

  async function handleNutritionSave(event) {
    event.preventDefault()
    setSaving('nutrition')

    try {
      const saved = await saveNutritionTarget({
        weekStartDate: nutrition.weekStartDate,
        calories: nutrition.calories,
        proteinG: nutrition.proteinG,
        carbsG: nutrition.carbsG === '' ? null : nutrition.carbsG,
        fatG: nutrition.fatG === '' ? null : nutrition.fatG
      })

      setNutrition({
        weekStartDate: saved.weekStartDate,
        calories: saved.calories,
        proteinG: saved.proteinG,
        carbsG: saved.carbsG ?? '',
        fatG: saved.fatG ?? ''
      })
      setMessage('nutrition', 'success', 'Nutrition target saved.')
    } catch (error) {
      setMessage('nutrition', 'error', apiMessage(error))
    } finally {
      setSaving('')
    }
  }

  async function handleWeightSave(event) {
    event.preventDefault()
    setSaving('weight')

    try {
      const saved = await saveWeightEntry({
        date: weight.date,
        weightKg: displayToKg(weight.currentWeight, settings.weightUnit)
      })

      setWeight({
        date: saved.date,
        currentWeight: kgToDisplay(saved.weightKg, settings.weightUnit)
      })
      setMessage('weight', 'success', 'Weight entry saved.')
    } catch (error) {
      setMessage('weight', 'error', apiMessage(error))
    } finally {
      setSaving('')
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border-4 border-border-app bg-panel p-6 shadow-panel">
        <p className="text-sm font-semibold text-muted">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-lg border-4 border-border-app bg-panel p-6 shadow-panel">
      <div>
        <h1 className="text-page-title font-bold text-heading">Settings</h1>
        <p className="mt-2 text-sm text-muted">
          Configure the inputs RunFuel uses for hybrid planning.
        </p>
        {messages.page ? <p className="mt-3 text-sm font-semibold text-danger">{messages.page.text}</p> : null}
      </div>

      <Section
        message={messages.settings}
        onSubmit={handleSettingsSave}
        saving={saving === 'settings'}
        title="Athlete Preferences"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Weight unit">
            <select
              className={selectClass}
              value={settings.weightUnit}
              onChange={(event) => handleWeightUnitChange(event.target.value)}
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </Field>
          <Field label="Distance unit">
            <select
              className={selectClass}
              value={settings.distanceUnit}
              onChange={(event) => setSettings({ ...settings, distanceUnit: event.target.value })}
            >
              <option value="km">km</option>
              <option value="miles">miles</option>
            </select>
          </Field>
          <Field label="Pace unit">
            <select
              className={selectClass}
              value={settings.paceUnit}
              onChange={(event) => handlePaceUnitChange(event.target.value)}
            >
              <option value="min_per_km">min/km</option>
              <option value="min_per_mile">min/mile</option>
            </select>
          </Field>
          <Field label={paceLabel}>
            <input
              className={inputClass}
              inputMode="decimal"
              placeholder="6:30"
              value={settings.easyPaceSecPerKm ?? ''}
              onChange={(event) => setSettings({ ...settings, easyPaceSecPerKm: event.target.value })}
            />
          </Field>
          <Field label="Goal type">
            <select
              className={selectClass}
              value={settings.goalType}
              onChange={(event) => setSettings({ ...settings, goalType: event.target.value })}
            >
              {goalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        message={messages.schedule}
        onSubmit={handleScheduleSave}
        saving={saving === 'schedule'}
        title="Weekly Gym Schedule"
      >
        <div className="overflow-x-auto rounded border-2 border-border-panel bg-input">
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <thead className="bg-control text-inverse">
              <tr>
                <th className="px-3 py-2 font-bold">Day</th>
                <th className="px-3 py-2 font-bold">Workout type</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const item = schedule.find((entry) => entry.dayOfWeek === day.dayOfWeek) || {
                  dayOfWeek: day.dayOfWeek,
                  workoutType: 'rest'
                }

                return (
                  <tr key={day.dayOfWeek} className="border-t border-border-panel">
                    <td className="px-3 py-2 font-semibold text-heading">{day.label}</td>
                    <td className="px-3 py-2">
                      <select
                        className={`${selectClass} w-full`}
                        value={item.workoutType}
                        onChange={(event) =>
                          setSchedule((current) =>
                            current.map((entry) =>
                              entry.dayOfWeek === day.dayOfWeek
                                ? { ...entry, workoutType: event.target.value }
                                : entry
                            )
                          )
                        }
                      >
                        {workoutOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        message={messages.nutrition}
        onSubmit={handleNutritionSave}
        saving={saving === 'nutrition'}
        title="Nutrition Target"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Field label="Week start" required>
            <input
              className={inputClass}
              type="date"
              value={nutrition.weekStartDate}
              onChange={(event) => setNutrition({ ...nutrition, weekStartDate: event.target.value })}
            />
          </Field>
          <Field label="Calories/day" required>
            <input
              className={inputClass}
              min="1"
              type="number"
              value={nutrition.calories}
              onChange={(event) => setNutrition({ ...nutrition, calories: event.target.value })}
            />
          </Field>
          <Field label="Protein/day (g)" required>
            <input
              className={inputClass}
              min="0"
              type="number"
              value={nutrition.proteinG}
              onChange={(event) => setNutrition({ ...nutrition, proteinG: event.target.value })}
            />
          </Field>
          <Field label="Carbs/day (g)">
            <input
              className={inputClass}
              min="0"
              type="number"
              value={nutrition.carbsG}
              onChange={(event) => setNutrition({ ...nutrition, carbsG: event.target.value })}
            />
          </Field>
          <Field label="Fat/day (g)">
            <input
              className={inputClass}
              min="0"
              type="number"
              value={nutrition.fatG}
              onChange={(event) => setNutrition({ ...nutrition, fatG: event.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section
        message={messages.weight}
        onSubmit={handleWeightSave}
        saving={saving === 'weight'}
        title="Weight Entry"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={weightLabel}>
            <input
              className={inputClass}
              min="1"
              step="0.1"
              type="number"
              value={weight.currentWeight}
              onChange={(event) => setWeight({ ...weight, currentWeight: event.target.value })}
            />
          </Field>
          <Field label="Date">
            <input
              className={inputClass}
              type="date"
              value={weight.date}
              onChange={(event) => setWeight({ ...weight, date: event.target.value })}
            />
          </Field>
        </div>
      </Section>
    </div>
  )
}
