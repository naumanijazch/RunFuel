import StatusMessage from './StatusMessage'

export default function FormSection({ children, message, onSubmit, saving, title }) {
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
      <StatusMessage className="mt-3" message={message} />
    </form>
  )
}
