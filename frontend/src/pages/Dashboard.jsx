import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL, fetchStravaRuns, fetchStravaStatus, fetchStravaSummary, syncStravaRuns } from '../api/client'

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

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border-2 border-border-panel bg-panel-strong p-4 shadow-control">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-heading">{value}</p>
    </div>
  )
}

function RunTable({ runs }) {
  if (!runs.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border-panel bg-panel-strong p-5 text-sm font-semibold text-muted">
        No runs synced yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border-2 border-border-panel bg-panel-strong shadow-control">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b-2 border-border-panel text-xs uppercase tracking-normal text-muted">
            <tr>
              <th className="px-4 py-3">Run</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Distance</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Pace</th>
              <th className="px-4 py-3">HR</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr className="border-b border-border-panel last:border-b-0" key={run.id || run.activityDate}>
                <td className="px-4 py-3 font-bold text-heading">{run.name}</td>
                <td className="px-4 py-3 text-muted">{formatDate(run.activityDate)}</td>
                <td className="px-4 py-3">{formatDistance(run.distanceKm)}</td>
                <td className="px-4 py-3">{formatDuration(run.movingTimeSeconds)}</td>
                <td className="px-4 py-3">{formatPace(run.paceSecPerKm)}</td>
                <td className="px-4 py-3">{run.averageHeartrate ? `${run.averageHeartrate} bpm` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [status, setStatus] = useState({ connected: false })
  const [summary, setSummary] = useState(emptySummary)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState(null)

  const recentRuns = useMemo(() => runs.length ? runs : summary.recentRuns || [], [runs, summary.recentRuns])
  const hasRuns = recentRuns.length > 0

  async function loadDashboard() {
    const [loadedStatus, loadedSummary] = await Promise.all([fetchStravaStatus(), fetchStravaSummary()])
    setStatus(loadedStatus)
    setSummary(loadedSummary)

    if (loadedStatus.connected) {
      const loadedRuns = await fetchStravaRuns()
      setRuns(loadedRuns)
    } else {
      setRuns([])
    }
  }

  useEffect(() => {
    async function load() {
      try {
        await loadDashboard()
      } catch (error) {
        setMessage({ type: 'error', text: apiMessage(error) })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  function connectStrava() {
    window.location.href = `${API_BASE_URL}/strava/connect`
  }

  async function handleSync() {
    setSyncing(true)
    setMessage(null)

    try {
      const result = await syncStravaRuns()
      await loadDashboard()
      setMessage({ type: 'success', text: `Synced ${result.importedCount} recent run${result.importedCount === 1 ? '' : 's'}.` })
    } catch (error) {
      setMessage({ type: 'error', text: apiMessage(error) })
    } finally {
      setSyncing(false)
    }
  }

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
            <h1 className="text-page-title font-bold text-heading">RunFuel Dashboard</h1>
            <p className="mt-2 text-sm text-muted">Strava-powered running data for your hybrid training week.</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="rounded border-2 border-border-panel bg-input px-3 py-2 text-sm font-bold text-heading">
              {status.connected ? 'Strava connected' : 'Strava not connected'}
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

        {status.connected && !hasRuns ? (
          <p className="mt-4 text-sm font-semibold text-muted">Connect successful. Sync your recent runs.</p>
        ) : null}
      </section>

      {status.connected ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Weekly distance" value={formatDistance(summary.weeklyDistanceKm)} />
            <MetricCard label="Runs this week" value={summary.totalRunsThisWeek} />
            <MetricCard label="Average pace" value={formatPace(summary.averagePaceSecPerKm)} />
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="rounded-lg border-2 border-border-panel bg-panel-strong p-5 shadow-control">
              <h2 className="text-lg font-bold text-heading">Latest run</h2>
              {summary.latestRun ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xl font-bold text-heading">{summary.latestRun.name}</p>
                    <p className="text-sm text-muted">{formatDate(summary.latestRun.activityDate)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-bold text-heading">{formatDistance(summary.latestRun.distanceKm)}</p>
                      <p className="text-muted">Distance</p>
                    </div>
                    <div>
                      <p className="font-bold text-heading">{formatPace(summary.latestRun.paceSecPerKm)}</p>
                      <p className="text-muted">Pace</p>
                    </div>
                    <div>
                      <p className="font-bold text-heading">{formatDuration(summary.latestRun.movingTimeSeconds)}</p>
                      <p className="text-muted">Moving time</p>
                    </div>
                    <div>
                      <p className="font-bold text-heading">
                        {summary.latestRun.averageHeartrate ? `${summary.latestRun.averageHeartrate} bpm` : '--'}
                      </p>
                      <p className="text-muted">Avg heart rate</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold text-muted">No latest run yet.</p>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-lg font-bold text-heading">Recent runs</h2>
              </div>
              <RunTable runs={recentRuns} />
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg border-2 border-dashed border-border-panel bg-panel-strong p-6 text-sm font-semibold text-muted">
          Connect Strava to import recent runs and fill this dashboard with weekly distance, run count, pace, and latest activity.
        </section>
      )}
    </div>
  )
}
