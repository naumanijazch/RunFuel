export default function MetricCard({ label, note, value, valueSize = '2xl' }) {
  const valueClass = valueSize === 'xl' ? 'text-xl' : 'text-2xl'

  return (
    <div className="rounded-lg border-2 border-border-panel bg-input p-4 shadow-control">
      <p className="text-xs font-bold uppercase tracking-normal text-muted">{label}</p>
      <p className={`mt-2 ${valueClass} font-bold leading-tight text-heading`}>{value}</p>
      {note ? <p className="mt-1 text-xs font-semibold text-muted">{note}</p> : null}
    </div>
  )
}
