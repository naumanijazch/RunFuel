export default function StatusMessage({ className = 'mt-4', message }) {
  if (!message) {
    return null
  }

  const toneClass = message.type === 'error' ? 'text-danger' : 'text-muted'

  return <p className={`${className} text-sm font-semibold ${toneClass}`}>{message.text}</p>
}
