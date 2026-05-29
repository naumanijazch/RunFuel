import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchCurrentRunPlan,
  fetchGymSchedule,
  fetchSettings,
  fetchTrainingLoadAnalysis,
  generateRunPlan
} from '../api/client'
import { apiMessage } from '../api/errors'
import { WarningCard } from '../components/FatigueWarnings'
import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import StatusMessage from '../components/StatusMessage'
import { PlanDayCard } from '../components/WeeklyPlan'
import { formatDistance, formatGoalType, formatPace, titleCase } from '../utils/formatters'
import { warningLabel } from '../utils/trainingBadges'

const defaultSettings = {
  distanceUnit: 'km',
  paceUnit: 'min_per_km',
  goalType: 'general_endurance'
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

        <StatusMessage message={message} />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Goal type" value={formatGoalType(settings.goalType)} valueSize="xl" />
        <MetricCard label="Easy pace" value={formatPace(settings.easyPaceSecPerKm, settings)} valueSize="xl" />
        <MetricCard label="Planned run days" value={`${plannedRunDays.length}`} note={plannedRunDays.map((day) => titleCase(day.workoutType)).join(' / ') || 'None'} valueSize="xl" />
        <MetricCard label="Last week mileage" value={formatDistance(weeklyStats.previousWeekKm, settings)} valueSize="xl" />
        <MetricCard label="Today readiness" value={todayDecision?.readinessLabel || '--'} note={todayDecision?.readinessScore !== null && todayDecision?.readinessScore !== undefined ? `Score ${Number(todayDecision.readinessScore).toFixed(1)}` : null} valueSize="xl" />
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
              <PlanDayCard day={day} key={day.dayOfWeek} settings={settings} />
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
                    <WarningCard
                      key={`${warning.code}-${warning.message}`}
                      label={warningLabel(warning.code)}
                      showSuggestion
                      warning={warning}
                    />
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
