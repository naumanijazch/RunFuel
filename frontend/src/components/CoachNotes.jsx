export default function CoachNotes({ notes }) {
  return (
    <section>
      <h3 className="text-base font-bold text-heading">Coach Notes</h3>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {notes.map((note) => (
          <li className="rounded-lg border-2 border-border-panel bg-input p-3 text-sm font-semibold text-muted" key={note}>
            {note}
          </li>
        ))}
      </ul>
    </section>
  )
}
