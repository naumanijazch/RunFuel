const KM_TO_MILES = 0.6213711922
const KG_TO_LBS = 2.2046226218

const defaultDisplaySettings = {
  weightUnit: 'kg',
  distanceUnit: 'km',
  paceUnit: 'min_per_km'
}

export function titleCase(value) {
  if (!value) {
    return '--'
  }

  return String(value)
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatGoalType(goalType) {
  return {
    '5k': '5K',
    '10k': '10K',
    general_endurance: 'General endurance',
    hybrid_conditioning: 'Hybrid conditioning'
  }[goalType] || titleCase(goalType)
}

export function formatWorkoutType(workoutType) {
  return {
    push: 'Push',
    pull: 'Pull',
    legs: 'Legs',
    upper: 'Upper',
    full_body: 'Full body',
    run: 'Run',
    rest: 'Rest'
  }[workoutType] || titleCase(workoutType)
}

export function formatDistance(km, settings = defaultDisplaySettings) {
  const value = Number(km || 0)

  if (settings.distanceUnit === 'miles') {
    return `${(value * KM_TO_MILES).toFixed(1)} mi`
  }

  return `${value.toFixed(1)} km`
}

export function formatPace(secondsPerKm, settings = defaultDisplaySettings) {
  if (!secondsPerKm) {
    return settings.paceUnit === 'min_per_mile' ? '-- /mi' : '-- /km'
  }

  const displaySeconds = Math.round(settings.paceUnit === 'min_per_mile' ? secondsPerKm * 1.609344 : secondsPerKm)
  const minutes = Math.floor(displaySeconds / 60)
  const seconds = displaySeconds % 60
  const label = settings.paceUnit === 'min_per_mile' ? '/mi' : '/km'
  return `${minutes}:${String(seconds).padStart(2, '0')} ${label}`
}

export function formatPaceRange(range, settings = defaultDisplaySettings) {
  if (!range) {
    return null
  }

  return `${formatPace(range.from, settings)}-${formatPace(range.to, settings)}`
}

export function formatWeight(weightKg, settings = defaultDisplaySettings) {
  if (!weightKg) {
    return '--'
  }

  const value = Number(weightKg)

  if (settings.weightUnit === 'lbs') {
    return `${(value * KG_TO_LBS).toFixed(1)} lbs`
  }

  return `${value.toFixed(1)} kg`
}

export function formatDuration(seconds) {
  if (!seconds) {
    return '0m 00s'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m ${String(secs).padStart(2, '0')}s`
}

export function formatDate(date) {
  if (!date) {
    return '--'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date))
}

export function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatPercent(value) {
  if (value === null || value === undefined) {
    return '--'
  }

  const prefix = Number(value) > 0 ? '+' : ''
  return `${prefix}${Number(value).toFixed(0)}%`
}

export function secondsToPace(seconds) {
  if (!seconds) {
    return ''
  }

  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function paceToSeconds(value) {
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

export function kgToDisplay(weightKg, unit) {
  if (!weightKg) {
    return ''
  }

  return unit === 'lbs' ? (weightKg * KG_TO_LBS).toFixed(1) : Number(weightKg).toFixed(1)
}

export function displayToKg(weight, unit) {
  const value = Number(weight)
  return unit === 'lbs' ? value / KG_TO_LBS : value
}

export function convertPaceDisplay(value, fromUnit, toUnit) {
  const seconds = paceToSeconds(value)

  if (!seconds || fromUnit === toUnit) {
    return value
  }

  const secPerKm = fromUnit === 'min_per_mile' ? seconds / 1.609344 : seconds
  const displaySeconds = toUnit === 'min_per_mile' ? secPerKm * 1.609344 : secPerKm
  return secondsToPace(displaySeconds)
}

export function convertWeightDisplay(value, fromUnit, toUnit) {
  if (!value || fromUnit === toUnit) {
    return value
  }

  const kg = displayToKg(value, fromUnit)
  return kgToDisplay(kg, toUnit)
}
