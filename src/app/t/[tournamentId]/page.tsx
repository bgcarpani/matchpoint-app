import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getPublicTournament,
  getPublicMatchPulse,
} from '@/lib/public/tournament'
import {
  CATEGORY_TYPE_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
} from '@/lib/domain/tournament'
import { PairRegistrationForm } from '@/components/public/pair-registration-form'
import { ThemeStyle } from '@/components/branding/theme-style'
import { logoPublicUrl } from '@/lib/branding/logo'

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const t = await getPublicTournament(tournamentId)
  if (!t) notFound()

  // ¿Llaves publicadas? public_bracket_view sólo expone torneos con el bracket
  // publicado → un conteo > 0 alcanza para mostrar el link.
  const supabase = await createClient()
  const { count: bracketCount } = await supabase
    .from('public_bracket_view')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', t.id)
  const bracketPublished = (bracketCount ?? 0) > 0

  // Pulso en vivo: zonas publicadas + partidos por jugar (sólo relevante con el
  // torneo en curso). Los que tienen cancha asignada se muestran como "en juego".
  const pulse = await getPublicMatchPulse(t.id)
  const liveNow =
    t.status === 'in_progress'
      ? pulse.pending.filter((m) => m.courtName).slice(0, 6)
      : []

  const isOpen = t.status === 'registration_open'
  const requestsFull = t.requested_pairs >= t.max_pair_requests
  const canRegister = isOpen && !requestsFull

  const logoUrl = logoPublicUrl(t.logo_path)

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
      <ThemeStyle themeKey={t.theme_key} />
      {/* Top bar */}
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-5">
          <span className="font-display text-lg text-foreground">
            Match<span className="text-volt">Up</span>
          </span>
          <a
            href="/turnos"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Turnos
          </a>
        </div>
        <span className="flex items-center gap-2.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- logo del CDN de Storage
            <img
              src={logoUrl}
              alt=""
              className="size-7 rounded-full border border-border object-cover"
            />
          )}
          {t.establishment_name}
        </span>
      </header>

      {/* Hero */}
      <section className="elevate-lg relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 sm:px-12 sm:py-16">
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
          </div>
        </div>
      </section>

      {/* Cupos / stats strip. La cantidad de solicitudes recibidas no se expone
          públicamente (no incentivar a "llenar" o colapsar los cupos). */}
      <section
        className={`reveal mt-4 grid grid-cols-1 gap-4 ${
          pulse.zonesCount > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
        style={{ animationDelay: '280ms' }}
      >
        <StatCard
          label="Cupos confirmados"
          value={t.accepted_pairs}
          total={t.max_pairs}
          unit="parejas"
          bar
        />
        {pulse.zonesCount > 0 && (
          <StatCard label="Zonas" value={pulse.zonesCount} unit="en juego" />
        )}
        <StatCard label="Canchas" value={t.courts.length} unit="disponibles" />
      </section>

      {/* En juego ahora: partidos pendientes con cancha asignada (torneo en curso) */}
      {liveNow.length > 0 && (
        <section
          className="reveal elevate mt-4 overflow-hidden rounded-2xl border border-volt/30 bg-card"
          style={{ animationDelay: '320ms' }}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-3.5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-volt">
              <span className="size-1.5 animate-pulse rounded-full bg-volt" aria-hidden />
              En juego ahora
            </span>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {liveNow.length} en cancha
            </span>
          </div>
          <ul className="divide-y divide-border">
            {liveNow.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-4 px-6 py-3.5"
              >
                <span className="hidden shrink-0 rounded-md bg-volt/10 px-2 py-0.5 text-xs font-semibold text-volt ring-1 ring-volt/30 sm:inline">
                  {m.courtName}
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-right font-medium text-foreground">
                    {m.team1Label}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">VS</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {m.team2Label}
                  </span>
                </div>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {m.zoneName}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Detalle + inscripción */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(380px,460px)]">
        {/* Detalle */}
        <div
          className="reveal elevate rounded-2xl border border-border bg-card p-6 sm:p-8"
          style={{ animationDelay: '340ms' }}
        >
          <SectionTitle>Detalles</SectionTitle>
          <dl className="mt-6 divide-y divide-border">
            <DetailRow label="Categoría" value={categoryLabel} />
            <DetailRow label="Género" value={GENDER_LABELS[t.gender]} />
            <DetailRow label="Fecha" value={dateLabel} />
            <DetailRow label="Apertura de inscripción" value={openLabel} />
            <DetailRow label="Estado" value={STATUS_LABELS[t.status]} />
            {t.address && <DetailRow label="Dónde" value={t.address} />}
          </dl>

          {t.maps_url && (
            <a
              href={t.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-volt hover:underline"
            >
              Cómo llegar →
            </a>
          )}

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

          {(t.zones_published || bracketPublished) && (
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
              {t.zones_published && (
                <a
                  href={`/t/${t.id}/zones`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-volt hover:underline"
                >
                  Ver zonas y partidos →
                </a>
              )}
              {bracketPublished && (
                <a
                  href={`/t/${t.id}/bracket`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-volt hover:underline"
                >
                  Ver llaves →
                </a>
              )}
            </div>
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
          />
        </div>
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
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
    <div className="elevate rounded-2xl border border-border bg-card p-6">
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
