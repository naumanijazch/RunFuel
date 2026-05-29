export const inputClass =
  'rounded border-2 border-border-panel bg-input px-3 py-2 text-sm text-text-app outline-none focus:border-focus'

export const selectClass = `${inputClass} cursor-pointer`

export default function FormField({ children, label, required = false }) {
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
