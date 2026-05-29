export default function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-lg border-2 border-border-panel bg-panel-strong p-5 shadow-control ${className}`}>
      {children}
    </section>
  )
}
