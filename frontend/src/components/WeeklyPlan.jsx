import { formatDistance, formatPaceRange, formatWorkoutType, titleCase } from '../utils/formatters'

function runBadgeClass(runType) {
  if (runType === 'easy') {
    return 'border-lens bg-lens-soft text-heading'
  }

  if (runType === 'steady' || runType === 'tempo') {
    return 'border-border-strong bg-action text-action-text'
  }

  return 'border-danger bg-danger text-danger-text'
}

export function PlanDayCard({ day, settings }) {
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
