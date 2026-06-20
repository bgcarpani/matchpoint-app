import type { PairStatus } from '@/lib/types/database'
import { PAIR_STATUS_LABELS } from '@/lib/domain/pair'
import type { InscriptionView } from '@/lib/public/inscription'

const STATUS_STYLE: Record<
  PairStatus,
  { dot: string; pill: string; note: string }
> = {
  pending: {
    dot: 'bg-[color:var(--warning)]',
    pill: 'border border-border text-foreground',
    note: 'Tu solicitud fue recibida y está a la espera de que el organizador la revise.',
  },
  accepted: {
    dot: 'bg-volt',
    pill: 'bg-volt text-volt-foreground',
    note: '¡Tu pareja fue aceptada! Vas a jugar el torneo.',
  },
  rejected: {
    dot: 'bg-destructive',
    pill: 'border border-destructive/40 text-destructive',
    note: 'El organizador no aceptó esta solicitud. Consultá con el establecimiento si tenés dudas.',
  },
}

export function InscriptionStatusCard({ data }: { data: InscriptionView }) {
  const s = STATUS_STYLE[data.status]

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Estado de la inscripción
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${s.pill}`}
        >
          <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
          {PAIR_STATUS_LABELS[data.status]}
        </span>
      </div>

      <h1 className="font-display mt-6 text-[clamp(1.75rem,6vw,2.75rem)] text-foreground">
        {data.tournament.name}
      </h1>
      <p className="mt-3 text-sm text-foreground">{s.note}</p>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Pareja
        </p>
        <ul className="mt-4 divide-y divide-border">
          <PlayerRow n={1} name={data.player1_name} />
          <PlayerRow n={2} name={data.player2_name} />
        </ul>
      </div>

      <a
        href={`/t/${data.tournament.id}`}
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-volt hover:underline"
      >
        Ver el torneo →
      </a>
    </div>
  )
}

function PlayerRow({ n, name }: { n: number; name: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3.5">
      <span className="font-display text-sm text-volt">Jugador {n}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {name}
      </span>
    </li>
  )
}
