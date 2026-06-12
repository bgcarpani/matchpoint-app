import { notFound } from 'next/navigation'
import { getPublicTournament } from '@/lib/public/tournament'
import {
  CATEGORY_TYPE_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
} from '@/lib/domain/tournament'
import { PairRegistrationForm } from '@/components/public/pair-registration-form'

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const t = await getPublicTournament(tournamentId)
  if (!t) notFound()

  const isOpen = t.status === 'registration_open'
  const requestsFull = t.requested_pairs >= t.max_pair_requests
  const canRegister = isOpen && !requestsFull

  const categoryLabel =
    t.category_type === 'individual'
      ? t.category_value
      : `${CATEGORY_TYPE_LABELS.suma} ${t.category_value}`

  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${t.tournament_date}T00:00:00`))

  const openLabel = t.registration_opens_at
    ? new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(t.registration_opens_at))
    : 'Apertura manual'

  return (
    <main className="relative z-[2] mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
      {/* Top bar */}
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t.establishment_name}
        </span>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card/40 px-6 py-12 sm:px-12 sm:py-16">
        <CourtMotif className="pointer-events-none absolute -right-16 -top-10 hidden h-[120%] w-auto text-court-line sm:block" />

        <div className="relative">
          <div
            className="reveal flex flex-wrap items-center gap-3"
            style={{ animationDelay: '40ms' }}
          >
            <StatusPill status={t.status} open={isOpen} />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground tnum">
              {dateLabel}
            </span>
          </div>

          <h1
            className="reveal font-display mt-6 text-[clamp(2.75rem,9vw,7rem)] text-foreground"
            style={{ animationDelay: '120ms' }}
          >
            {t.name}
          </h1>

          <div
            className="reveal mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
            style={{ animationDelay: '200ms' }}
          >
            <Tag accent>{categoryLabel}</Tag>
            <Divider />
            <Tag>{GENDER_LABELS[t.gender]}</Tag>
            <Divider />
            <Tag>{CATEGORY_TYPE_LABELS[t.category_type]}</Tag>
          </div>
        </div>
      </section>

      {/* Cupos / stats strip */}
      <section
        className="reveal mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3"
        style={{ animationDelay: '280ms' }}
      >
        <StatCard
          label="Cupos confirmados"
          value={t.accepted_pairs}
          total={t.max_pairs}
          unit="parejas"
          bar
        />
        <StatCard
          label="Solicitudes"
          value={t.requested_pairs}
          total={t.max_pair_requests}
          unit="recibidas"
          bar
        />
        <StatCard label="Canchas" value={t.courts.length} unit="en juego" />
      </section>

      {/* Detalle + inscripción */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(380px,460px)]">
        {/* Detalle */}
        <div
          className="reveal rounded-2xl border border-border bg-card/40 p-6 sm:p-8"
          style={{ animationDelay: '340ms' }}
        >
          <SectionTitle>Detalles</SectionTitle>
          <dl className="mt-6 divide-y divide-border">
            <DetailRow label="Categoría" value={categoryLabel} />
            <DetailRow label="Género" value={GENDER_LABELS[t.gender]} />
            <DetailRow label="Fecha" value={dateLabel} />
            <DetailRow label="Apertura de inscripción" value={openLabel} />
            <DetailRow label="Estado" value={STATUS_LABELS[t.status]} />
          </dl>

          <SectionTitle className="mt-10">Canchas</SectionTitle>
          <ul className="mt-5 flex flex-wrap gap-2">
            {t.courts.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
              >
                <span
                  className={`size-1.5 rounded-full ${
                    c.type === 'indoor' ? 'bg-volt' : 'bg-muted-foreground'
                  }`}
                  aria-hidden
                />
                {c.name}
                <span className="text-xs text-muted-foreground">
                  {c.type === 'indoor' ? 'Techada' : 'Aire libre'}
                </span>
              </li>
            ))}
          </ul>

          {t.zones_published && (
            <a
              href={`/t/${t.id}/zones`}
              className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-volt hover:underline"
            >
              Ver zonas y partidos →
            </a>
          )}
        </div>

        {/* Inscripción */}
        <div
          className="reveal lg:sticky lg:top-6 lg:self-start"
          style={{ animationDelay: '400ms' }}
        >
          <PairRegistrationForm
            tournamentId={t.id}
            canRegister={canRegister}
            status={t.status}
            requestsFull={requestsFull}
            slotsLeft={Math.max(t.max_pair_requests - t.requested_pairs, 0)}
          />
        </div>
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
        Al inscribirte recibís un enlace privado para seguir el estado de tu
        solicitud sin necesidad de cuenta.
      </footer>
    </main>
  )
}

/* ----------------------------- piezas UI ----------------------------- */

function StatusPill({
  status,
  open,
}: {
  status: import('@/lib/types/database').TournamentStatus
  open: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
        open
          ? 'bg-volt text-volt-foreground'
          : 'border border-border text-muted-foreground'
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          open ? 'animate-pulse bg-volt-foreground' : 'bg-muted-foreground'
        }`}
        aria-hidden
      />
      {STATUS_LABELS[status]}
    </span>
  )
}

function Tag({
  children,
  accent,
}: {
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-sm font-medium ${
        accent
          ? 'bg-volt/10 text-volt ring-1 ring-volt/30'
          : 'bg-secondary text-secondary-foreground'
      }`}
    >
      {children}
    </span>
  )
}

function Divider() {
  return <span className="h-4 w-px bg-border" aria-hidden />
}

function SectionTitle({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={`text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground ${className}`}
    >
      {children}
    </h2>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  )
}

function StatCard({
  label,
  value,
  total,
  unit,
  bar,
}: {
  label: string
  value: number
  total?: number
  unit: string
  bar?: boolean
}) {
  const pct = total ? Math.min(Math.round((value / total) * 100), 100) : 0
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-4 text-5xl text-foreground tnum">
        {value}
        {total != null && (
          <span className="text-muted-foreground">/{total}</span>
        )}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {unit}
      </p>
      {bar && total != null && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full origin-left rounded-full bg-volt"
            style={{
              width: `${pct}%`,
              animation: 'grow-x 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
            }}
          />
        </div>
      )}
    </div>
  )
}

function CourtMotif({ className }: { className?: string }) {
  // Contorno estilizado de una cancha de pádel (decorativo)
  return (
    <svg
      viewBox="0 0 200 400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <rect x="10" y="10" width="180" height="380" />
      <line x1="10" y1="200" x2="190" y2="200" />
      <line x1="100" y1="10" x2="100" y2="200" />
      <line x1="100" y1="200" x2="100" y2="390" />
      <rect x="10" y="70" width="180" height="60" />
      <rect x="10" y="270" width="180" height="60" />
    </svg>
  )
}
