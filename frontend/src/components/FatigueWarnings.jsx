import { titleCase } from '../utils/formatters'
import { severityClass } from '../utils/trainingBadges'

export function WarningCard({ label, showSuggestion = false, warning }) {
  return (
    <div className="rounded-lg border-2 border-border-panel bg-input p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-1 text-xs font-bold ${label ? 'border-lens bg-lens-soft text-heading' : severityClass(warning.severity)}`}>
          {label || warning.severity}
        </span>
        <p className="font-bold text-heading">{warning.title || titleCase(warning.code)}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-muted">{warning.message}</p>
      {showSuggestion && warning.suggestion ? <p className="mt-1 text-sm font-semibold text-heading">{warning.suggestion}</p> : null}
    </div>
  )
}
