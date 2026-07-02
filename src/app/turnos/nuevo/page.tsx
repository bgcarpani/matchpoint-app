import Link from 'next/link'
import { NewShiftForm } from '../components/new-shift-form'

export const metadata = {
  title: 'Publicar turno — MatchUp',
}

export default function NuevoTurnoPage() {
  return (
    <main>
      <Link
        href="/turnos"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Volver al tablero
      </Link>

      <h1 className="font-display mt-4 text-3xl text-foreground sm:text-4xl">
        Publicar turno
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tenés una cancha reservada y te faltan jugadores. Publicá el turno y que
        te encuentren.
      </p>

      <div className="mt-8">
        <NewShiftForm />
      </div>
    </main>
  )
}
