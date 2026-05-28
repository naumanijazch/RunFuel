import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  API_BASE_URL,
  fetchCurrentNutritionTarget,
  fetchLatestWeight,
  fetchStravaRuns,
  fetchStravaStatus,
  fetchStravaSummary,
  syncStravaRuns
} from '../api/client'

const emptySummary = {
  weeklyDistanceKm: 0,
  totalRunsThisWeek: 0,
  averagePaceSecPerKm: null,
  latestRun: null,
  recentRuns: []
}

function formatDistance(km) {
  return `${Number(km || 0).toFixed(1)} km`
}

function formatPace(secondsPerKm) {
  if (!secondsPerKm) {
    return '-- /km'
  }

  const minutes = Math.floor(secondsPerKm / 60)
  const seconds = Math.round(secondsPerKm % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')} /km`
}

function formatDuration(seconds) {
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

function formatDate(date) {
  if (!date) {
    return '--'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date))
}

function apiMessage(error) {
  return error?.response?.data?.message || 'Something went wrong.'
}

function MetricCard({ label, value, note }) {
  return (
    <div className="rounded-lg border-2 border-border-panel bg-input p-4 shadow-control">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold leading-tight text-heading">{value}</p>
      {note ? <p className="mt-1 text-xs font-semibold text-muted">{note}</p> : null}
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-lg border-2 border-border-panel bg-panel-strong p-5 shadow-control ${className}`}>
      {children}
    </section>
  )
}

function EmptyStravaCard({ connected, onConnect, onSync, syncing }) {
  if (!connected) {
    return (
      <Panel className="border-dashed">
        <h2 className="text-lg font-bold text-heading">Connect your running source</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-muted">
          Link Strava to import your recent runs and turn this dashboard into a weekly training command center.
        </p>
        <button
          className="mt-4 rounded border-2 border-border-strong bg-action px-4 py-2 text-sm font-bold text-action-text hover:bg-action-hover"
          onClick={onConnect}
          type="button"
        >
          Connect Strava
        </button>
      </Panel>
    )
  }

  return (
    <Panel className="border-dashed">
      <h2 className="text-lg font-bold text-heading">Ready to import runs</h2>
      <p className="mt-2 max-w-2xl text-sm font-semibold text-muted">
        Your Strava account is connected. Sync your recent runs to begin planning.
      </p>
      <button
        className="mt-4 rounded border-2 border-border-strong bg-action px-4 py-2 text-sm font-bold text-action-text hover:bg-action-hover disabled:opacity-60"
        disabled={syncing}
        onClick={onSync}
        type="button"
      >
        {syncing ? 'Syncing...' : 'Sync Runs'}
      </button>
    </Panel>
  )
}

function LatestRunCard({ run }) {
  return (
    <Panel className="bg-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-muted">Latest run</p>
          <h2 className="mt-1 text-2xl font-bold text-heading">{run?.name || 'No runs synced yet.'}</h2>
        </div>
        {run ? <span className="rounded border-2 border-border-panel bg-input px-3 py-1 text-xs font-bold text-heading">{formatDate(run.activityDate)}</span> : null}
      </div>

      {run ? (
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-2xl font-bold text-heading">{formatDistance(run.distanceKm)}</p>
            <p className="font-semibold text-muted">Distance</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-heading">{formatDuration(run.movingTimeSeconds)}</p>
            <p className="font-semibold text-muted">Duration</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-heading">{formatPace(run.paceSecPerKm)}</p>
            <p className="font-semibold text-muted">Pace</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-heading">{run.averageHeartrate ? `${run.averageHeartrate}` : '--'}</p>
            <p className="font-semibold text-muted">Avg HR</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-muted">No runs synced yet.</p>
      )}
    </Panel>
  )
}

function RecentRunsTable({ runs }) {
  if (!runs.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border-panel bg-panel-strong p-5 text-sm font-semibold text-muted">
        No runs synced yet.
      </div>
    )
  }

  return (
    <div className="max-h-[24rem] overflow-auto rounded-lg border-2 border-border-panel bg-panel-strong shadow-control">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="sticky top-0 border-b-2 border-border-panel bg-panel-strong text-xs uppercase tracking-normal text-muted">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Distance</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Pace</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr className="border-b border-border-panel last:border-b-0" key={run.id || run.activityDate}>
              <td className="px-4 py-3 text-muted">{formatDate(run.activityDate)}</td>
              <td className="px-4 py-3 font-bold text-heading">{run.name}</td>
              <td className="px-4 py-3">{formatDistance(run.distanceKm)}</td>
              <td className="px-4 py-3">{formatDuration(run.movingTimeSeconds)}</td>
              <td className="px-4 py-3">{formatPace(run.paceSecPerKm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WeightNutritionSummary({ weight, nutrition }) {
  const hasPersonalData = Boolean(weight || nutrition)

  return (
    <Panel className="self-start">
      <h2 className="text-lg font-bold text-heading">Recovery context</h2>
      {hasPersonalData ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-muted">Weight</p>
            <p className="mt-1 text-2xl font-bold text-heading">{weight ? `${Number(weight.weightKg).toFixed(1)} kg` : '--'}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{weight ? `Updated ${formatDate(weight.date)}` : 'No weight entry yet'}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-muted">Nutrition goal</p>
            <p className="mt-1 text-2xl font-bold text-heading">{nutrition ? `${nutrition.calories} kcal/day` : '--'}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{nutrition ? `${nutrition.proteinG}g protein/day` : 'No nutrition target yet'}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-muted">Complete your settings to personalize your dashboard.</p>
      )}
    </Panel>
  )
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState({ connected: false })
  const [summary, setSummary] = useState(emptySummary)
  const [runs, setRuns] = useState([])
  const [latestWeight, setLatestWeight] = useState(null)
  const [nutritionTarget, setNutritionTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)
  const autoSyncStarted = useRef(false)

  const recentRuns = useMemo(() => {
    const sourceRuns = runs.length ? runs : summary.recentRuns || []
    return [...sourceRuns]
      .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
      .slice(0, 10)
  }, [runs, summary.recentRuns])

  const hasRuns = recentRuns.length > 0

  const loadDashboard = useCallback(async () => {
    const [loadedStatus, loadedSummary, loadedWeight, loadedNutrition] = await Promise.all([
      fetchStravaStatus(),
      fetchStravaSummary(),
      fetchLatestWeight(),
      fetchCurrentNutritionTarget()
    ])

    setStatus(loadedStatus)
    setSummary(loadedSummary || emptySummary)
    setLatestWeight(loadedWeight)
    setNutritionTarget(loadedNutrition)

    if (loadedStatus.connected) {
      const loadedRuns = await fetchStravaRuns()
      setRuns(loadedRuns || [])
    } else {
      setRuns([])
    }

    return loadedStatus
  }, [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setMessage({ type: 'status', text: 'Syncing your latest Strava runs...' })

    try {
      const result = await syncStravaRuns()
      await loadDashboard()
      setMessage({
        type: 'success',
        text: `Last synced successfully. Imported ${result.importedCount} recent run${result.importedCount === 1 ? '' : 's'}.`
      })
    } catch (error) {
      setMessage({ type: 'error', text: apiMessage(error) })
    } finally {
      setSyncing(false)
    }
  }, [loadDashboard])

  useEffect(() => {
    async function load() {
      try {
        const loadedStatus = await loadDashboard()

        if (searchParams.get('strava') === 'connected' && loadedStatus.connected && !autoSyncStarted.current) {
          autoSyncStarted.current = true
          setSearchParams({}, { replace: true })
          await handleSync()
        } else if (searchParams.get('strava') === 'error') {
          setMessage({ type: 'error', text: 'Strava connection failed. Please try again.' })
        }
      } catch (error) {
        setMessage({ type: 'error', text: apiMessage(error) })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [handleSync, loadDashboard, searchParams, setSearchParams])

  function connectStrava() {
    window.location.href = `${API_BASE_URL}/strava/connect`
  }

  const connectionLabel = syncing
    ? 'Syncing'
    : message?.type === 'success'
      ? 'Last synced successfully'
      : status.connected
        ? 'Connected'
        : 'Not connected'

  if (loading) {
    return (
      <div className="rounded-lg border-4 border-border-app bg-panel p-6 shadow-panel">
        <p className="text-sm font-semibold text-muted">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-4 border-border-app bg-panel p-6 shadow-panel">
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <h1 className="text-page-title font-bold text-heading">RunFuel</h1>
            <p className="mt-2 text-sm font-semibold text-muted">Strava-connected hybrid athlete planner</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="rounded border-2 border-border-panel bg-input px-3 py-2 text-sm font-bold text-heading">
              {connectionLabel}
            </span>
            {status.connected ? (
              <button
                className="rounded border-2 border-border-strong bg-action px-4 py-2 text-sm font-bold text-action-text hover:bg-action-hover disabled:opacity-60"
                disabled={syncing}
                onClick={handleSync}
                type="button"
              >
                {syncing ? 'Syncing...' : 'Sync Runs'}
              </button>
            ) : (
              <button
                className="rounded border-2 border-border-strong bg-action px-4 py-2 text-sm font-bold text-action-text hover:bg-action-hover"
                onClick={connectStrava}
                type="button"
              >
                Connect Strava
              </button>
            )}
          </div>
        </div>

        {message ? (
          <p className={`mt-4 text-sm font-semibold ${message.type === 'error' ? 'text-danger' : 'text-muted'}`}>
            {message.text}
          </p>
        ) : null}
      </section>

      {!status.connected || !hasRuns ? (
        <EmptyStravaCard connected={status.connected} onConnect={connectStrava} onSync={handleSync} syncing={syncing} />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
        <LatestRunCard run={summary.latestRun} />
        <WeightNutritionSummary weight={latestWeight} nutrition={nutritionTarget} />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Weekly running distance" value={formatDistance(summary.weeklyDistanceKm)} />
        <MetricCard label="Runs this week" value={`${summary.totalRunsThisWeek || 0} runs`} />
        <MetricCard label="Average pace" value={formatPace(summary.averagePaceSecPerKm)} />
        <MetricCard label="Current weight" value={latestWeight ? `${Number(latestWeight.weightKg).toFixed(1)} kg` : '--'} />
        <MetricCard label="Daily calorie target" value={nutritionTarget ? `${nutritionTarget.calories} kcal/day` : '--'} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-heading">Recent runs</h2>
          <span className="text-xs font-bold uppercase tracking-normal text-muted">Newest first</span>
        </div>
        <RecentRunsTable runs={recentRuns} />
      </section>
    </div>
  )
}
