import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchCurrentRunPlan,
  fetchGymSchedule,
  fetchSettings,
  fetchTrainingLoadAnalysis,
  generateRunPlan
} from '../api/client'

const defaultSettings = {
  distanceUnit: 'km',
  paceUnit: 'min_per_km',
  goalType: 'general_endurance'
}

const KM_TO_MILES = 0.6213711922

function apiMessage(error) {
  return error?.response?.data?.message || 'Something went wrong.'
}

function titleCase(value) {
  if (!value) {
    return '--'
  }

  return String(value)
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

function formatGoalType(goalType) {
  return {
    '5k': '5K',
    '10k': '10K',
    general_endurance: 'General endurance',
    hybrid_conditioning: 'Hybrid conditioning'
  }[goalType] || titleCase(goalType)
}

function formatDistance(km, settings = defaultSettings) {
  const value = Number(km || 0)

  if (settings.distanceUnit === 'miles') {
    return `${(value * KM_TO_MILES).toFixed(1)} mi`
  }

  return `${value.toFixed(1)} km`
}

function formatPace(secondsPerKm, settings = defaultSettings) {
  if (!secondsPerKm) {
    return settings.paceUnit === 'min_per_mile' ? '-- /mi' : '-- /km'
  }

  const displaySeconds = Math.round(settings.paceUnit === 'min_per_mile' ? secondsPerKm * 1.609344 : secondsPerKm)
  const minutes = Math.floor(displaySeconds / 60)
  const seconds = displaySeconds % 60
  const label = settings.paceUnit === 'min_per_mile' ? '/mi' : '/km'
  return `${minutes}:${String(seconds).padStart(2, '0')} ${label}`
}

function formatPaceRange(range, settings) {
  if (!range) {
    return null
  }

  return `${formatPace(range.from, settings)}-${formatPace(range.to, settings)}`
}

function formatWorkoutType(workoutType) {
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

function runBadgeClass(runType) {
  if (runType === 'easy') {
    return 'border-lens bg-lens-soft text-heading'
  }

  if (runType === 'steady' || runType === 'tempo') {
    return 'border-border-strong bg-action text-action-text'
  }

  return 'border-danger bg-danger text-danger-text'
}

function warningLabel(code) {
  if (code?.includes('MILEAGE') || code?.includes('TARGET')) {
    return 'Load caution'
  }

  if (code?.includes('READINESS') || code?.includes('REST')) {
    return 'Recovery note'
  }

  return 'Planning note'
}

function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-lg border-2 border-border-panel bg-panel-strong p-5 shadow-control ${className}`}>
      {children}
    </section>
  )
}

function ContextCard({ label, value, note }) {
  return (
    <div className="rounded-lg border-2 border-border-panel bg-input p-4 shadow-control">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold leading-tight text-heading">{value}</p>
      {note ? <p className="mt-1 text-xs font-semibold text-muted">{note}</p> : null}
    </div>
  )
}

function DayCard({ day, settings }) {
  const plannedRun = day.plannedRun

  return (
    <article className="rounded-lg border-2 border-border-panel bg-input p-4 shadow-control">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-muted">{day.label}</p>
          <h3 className="mt-1 text-lg font-bold text-heading">{formatWorkoutType(day.scheduledWorkoutType)}</h3>
        </div>
        {plannedRun ? (
          <span className={`rounded border px-2 py-1 text-xs font-bold ${runBadgeClass(plannedRun.runType)}`}>
            {plannedRun.runType === 'easy' ? 'Easy' : titleCase(plannedRun.runType)}
          </span>
        ) : null}
      </div>

      {plannedRun ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-base font-bold text-heading">{plannedRun.title}</p>
            <p className="text-sm font-bold text-muted">{formatDistance(plannedRun.distanceKm, settings)}</p>
          </div>
          {plannedRun.paceRangeSecPerKm ? (
            <p className="text-sm font-semibold text-muted">{formatPaceRange(plannedRun.paceRangeSecPerKm, settings)}</p>
          ) : null}
          {plannedRun.paceGuidance ? <p className="text-sm font-semibold text-muted">{plannedRun.paceGuidance}</p> : null}
          {plannedRun.structure ? <p className="text-sm font-semibold text-heading">{plannedRun.structure}</p> : null}
          <p className="text-xs font-semibold text-muted">{plannedRun.purpose}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-muted">No planned run.</p>
      )}
    </article>
  )
}

export default function Planner() {
  const [settings, setSettings] = useState(defaultSettings)
  const [gymSchedule, setGymSchedule] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState(null)

  const plannedRunDays = useMemo(
    () => gymSchedule.filter((day) => day.workoutType === 'run'),
    [gymSchedule]
  )
  const noRunDays = plan?.plannerWarnings?.some((warning) => warning.code === 'NO_RUN_DAYS') || plannedRunDays.length === 0

  const loadPlanner = useCallback(async () => {
    const [loadedSettings, loadedSchedule, loadedAnalysis, loadedPlan] = await Promise.all([
      fetchSettings(),
      fetchGymSchedule(),
      fetchTrainingLoadAnalysis(),
      fetchCurrentRunPlan()
    ])

    setSettings({ ...defaultSettings, ...(loadedSettings || {}) })
    setGymSchedule(loadedSchedule || [])
    setAnalysis(loadedAnalysis)
    setPlan(loadedPlan)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        await loadPlanner()
      } catch (error) {
        setMessage({ type: 'error', text: apiMessage(error) })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadPlanner])

  async function handleGenerate() {
    setGenerating(true)
    setMessage({ type: 'status', text: 'Generating this week run plan...' })

    try {
      const generatedPlan = await generateRunPlan()
      setPlan(generatedPlan)
      setMessage({ type: 'success', text: 'This week run plan is ready.' })
      await loadPlanner()
    } catch (error) {
      setMessage({ type: 'error', text: apiMessage(error) })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border-4 border-border-app bg-panel p-6 shadow-panel">
        <p className="text-sm font-semibold text-muted">Loading planner...</p>
      </div>
    )
  }

  const todayDecision = analysis?.todayDecision
  const weeklyStats = analysis?.weeklyRunStats || {}

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-4 border-border-app bg-panel p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-page-title font-bold text-heading">Hybrid Run Planner</h1>
            <p className="mt-2 text-sm font-semibold text-muted">
              Generate easy and quality runs around your gym week and Strava history.
            </p>
          </div>
          <button
            className="rounded border-2 border-border-strong bg-action px-4 py-2 text-sm font-bold text-action-text hover:bg-action-hover disabled:opacity-60"
            disabled={generating}
            onClick={handleGenerate}
            type="button"
          >
            {generating ? 'Generating...' : "Generate this week's plan"}
          </button>
        </div>

        {message ? (
          <p className={`mt-4 text-sm font-semibold ${message.type === 'error' ? 'text-danger' : 'text-muted'}`}>
            {message.text}
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <ContextCard label="Goal type" value={formatGoalType(settings.goalType)} />
        <ContextCard label="Easy pace" value={formatPace(settings.easyPaceSecPerKm, settings)} />
        <ContextCard label="Planned run days" value={`${plannedRunDays.length}`} note={plannedRunDays.map((day) => titleCase(day.workoutType)).join(' / ') || 'None'} />
        <ContextCard label="Last week mileage" value={formatDistance(weeklyStats.previousWeekKm, settings)} />
        <ContextCard label="Today readiness" value={todayDecision?.readinessLabel || '--'} note={todayDecision?.readinessScore !== null && todayDecision?.readinessScore !== undefined ? `Score ${Number(todayDecision.readinessScore).toFixed(1)}` : null} />
      </section>

      {noRunDays ? (
        <Panel className="border-dashed">
          <h2 className="text-lg font-bold text-heading">No run days are set.</h2>
          <p className="mt-2 text-sm font-semibold text-muted">Add run days in Settings to generate a plan.</p>
          <Link
            className="mt-4 inline-flex rounded border-2 border-border-strong bg-action px-4 py-2 text-sm font-bold text-action-text hover:bg-action-hover"
            to="/settings"
          >
            Go to Settings
          </Link>
        </Panel>
      ) : null}

      {plan ? (
        <>
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-heading">This Week&apos;s Plan</h2>
                <p className="mt-2 text-sm font-semibold text-muted">{plan.summary}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-heading">{formatDistance(plan.targetWeeklyDistanceKm, settings)}</p>
                <p className="text-xs font-bold uppercase tracking-normal text-muted">Target distance</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-heading">
              This plan gives you {plan.easyRunCount} easy run{plan.easyRunCount === 1 ? '' : 's'} and {plan.qualityRunCount} quality run{plan.qualityRunCount === 1 ? '' : 's'}.
            </p>
          </Panel>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            {plan.planDays?.map((day) => (
              <DayCard day={day} key={day.dayOfWeek} settings={settings} />
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <h2 className="text-lg font-bold text-heading">Why This Plan</h2>
              <ul className="ml-5 mt-3 list-disc space-y-2 text-sm font-semibold text-muted">
                {(plan.explanation || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Panel>

            <Panel>
              <h2 className="text-lg font-bold text-heading">Planner Notes</h2>
              {plan.plannerWarnings?.length ? (
                <div className="mt-3 space-y-3">
                  {plan.plannerWarnings.map((warning) => (
                    <div className="rounded-lg border-2 border-border-panel bg-input p-3" key={`${warning.code}-${warning.message}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-lens bg-lens-soft px-2 py-1 text-xs font-bold text-heading">
                          {warningLabel(warning.code)}
                        </span>
                        <p className="font-bold text-heading">{warning.title || titleCase(warning.code)}</p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-muted">{warning.message}</p>
                      {warning.suggestion ? <p className="mt-1 text-sm font-semibold text-heading">{warning.suggestion}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border-2 border-border-panel bg-input p-3 text-sm font-semibold text-muted">
                  No planner notes for this week.
                </p>
              )}
            </Panel>
          </div>
        </>
      ) : (
        <Panel className="border-dashed">
          <h2 className="text-lg font-bold text-heading">No plan generated for this week yet.</h2>
          <p className="mt-2 text-sm font-semibold text-muted">Generate this week&apos;s plan when your Settings and Strava context are ready.</p>
        </Panel>
      )}
    </div>
  )
}
