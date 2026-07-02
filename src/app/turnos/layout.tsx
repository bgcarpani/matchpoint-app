import Link from 'next/link'

/**
 * Layout mínimo del Tablero de turnos — sección pública de jugadores, sin
 * `OrganizerHeader` ni área autenticada. Solo el wordmark de MatchUp.
 */
export default function TurnosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative z-[2] mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="font-display text-lg text-foreground transition-opacity hover:opacity-80"
        >
          Match<span className="text-volt">Up</span>
        </Link>
        <Link
          href="/turnos"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Turnos
        </Link>
      </header>
      {children}
    </div>
  )
}
