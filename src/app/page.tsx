import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ShowcaseCarousel } from '@/components/landing/showcase-carousel'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const year = new Date().getFullYear()
  return (
    <main className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </span>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/turnos"
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Turnos
          </Link>
          <Link
            href="/login"
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ingresar
          </Link>
        </nav>
      </header>

      {/* Hero: entrada de dos puertas — Torneos (organizadores) y Turnos (jugadores).
          Cada puerta muestra un vistazo REAL de su producto en vez de ícono + texto. */}
      <section className="pt-10 pb-4 sm:pt-14">
        <div className="text-center">
          <h1 className="font-display reveal mx-auto max-w-4xl text-[clamp(2.25rem,6.5vw,4.25rem)] leading-[0.95] text-foreground">
            Todo tu pádel, en un solo lugar
          </h1>
          <p
            className="reveal mx-auto mt-5 max-w-xl text-base text-muted-foreground"
            style={{ animationDelay: '0.08s' }}
          >
            Organizá torneos o encontrá con quién jugar. Elegí por dónde entrar.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {/* Puerta 1 — Torneos (organizadores) */}
          <div
            className="elevate-lg reveal flex flex-col rounded-2xl border border-border bg-card p-6 sm:p-7"
            style={{ animationDelay: '0.16s' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                Torneos
              </h2>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Para organizadores
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Gestioná tus torneos de principio a fin: inscripciones, zonas,
              resultados y llaves.
            </p>

            {/* Vistazo: un torneo como lo ve el organizador */}
            <div
              className="mt-5 flex flex-1 flex-col rounded-xl bg-secondary/60 p-4"
              aria-hidden="true"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0 flex-1 basis-40">
                  <p className="whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Suma 14 · Mixto
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-foreground">
                    Copa Invierno
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[color:var(--success-tint)] px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--success-deep)]">
                  <span className="size-1.5 rounded-full bg-[color:var(--success)]" />
                  Inscripción abierta
                </span>
              </div>
              <div className="min-h-3 flex-1" />
              <div className="flex items-center justify-between border-t border-border/70 pt-3">
                <span className="text-xs text-muted-foreground">
                  <span className="font-mono tnum font-bold text-foreground">
                    12/16
                  </span>{' '}
                  parejas
                </span>
                <span className="font-mono tnum text-xs font-bold text-muted-foreground">
                  SÁB 09 AGO
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'font-display h-12 px-6 text-base'
                )}
              >
                Crear cuenta →
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-12 px-6 text-base'
                )}
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          {/* Puerta 2 — Turnos (jugadores, sin login) */}
          <div
            className="elevate-lg reveal flex flex-col rounded-2xl border border-border bg-card p-6 sm:p-7"
            style={{ animationDelay: '0.24s' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                Turnos
              </h2>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Para jugadores · sin cuenta
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              ¿Te falta gente para completar la cancha? Publicá el turno y que
              te escriban directo por WhatsApp.
            </p>

            {/* Vistazo: el tablero con turnos abiertos */}
            <div
              className="mt-5 flex-1 rounded-xl bg-secondary/60 p-4"
              aria-hidden="true"
            >
              <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-volt" />
                El tablero · hoy
              </p>
              <div className="mt-2 divide-y divide-border/70">
                <BoardRow
                  court="Cancha 2 · Padel God"
                  missing="Faltan 2"
                  when="HOY 20:00"
                />
                <BoardRow
                  court="La Nave · techada"
                  missing="Falta 1"
                  when="MAÑ 19:00"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/turnos"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'font-display h-12 px-6 text-base'
                )}
              >
                Ver el tablero →
              </Link>
              <Link
                href="/turnos/nuevo"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-12 px-6 text-base'
                )}
              >
                Publicar turno
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ ORGANIZADORES ============================ */}
      <section className="mt-14 border-t border-border pt-14 pb-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-volt">
              Para organizadores
            </p>
            <h2 className="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] text-foreground">
              Un torneo, de principio a fin
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              El ciclo completo en un solo lugar, sin planillas ni grupos de
              WhatsApp caóticos.
            </p>

            {/* El ciclo de vida del torneo ES una secuencia: por eso va numerado. */}
            <ol className="mt-8 divide-y divide-border border-y border-border">
              <LifecycleStep
                n="01"
                title="Inscripciones"
                desc="Compartís el link o el QR y las parejas se anotan solas. Vos aceptás, rechazás o cargás a mano."
              />
              <LifecycleStep
                n="02"
                title="Zonas y partidos"
                desc="Generás las zonas al azar y el fixture round-robin se arma solo. Retocás lo que quieras antes de publicar."
              />
              <LifecycleStep
                n="03"
                title="Resultados y posiciones"
                desc="Cargás los resultados y la tabla se ordena sola: puntos, games, diferencia."
              />
              <LifecycleStep
                n="04"
                title="Llaves y campeón"
                desc="Cuadro de eliminación directa hasta la final. El campeón sale listo para compartir."
              />
            </ol>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-volt" />
                Calendario del club + QR que se actualiza solo
              </span>
              <span className="inline-flex items-center gap-2">
                <ShareIcon className="h-4 w-4 text-volt" />
                Todo se comparte a WhatsApp e Instagram
              </span>
            </div>
          </div>

          {/* Vistazo al producto */}
          <div className="w-full max-w-sm justify-self-center lg:sticky lg:top-8 lg:justify-self-end">
            <ShowcaseCarousel />
          </div>
        </div>
      </section>

      {/* Tu marca (personalización de /settings) */}
      <section className="pb-4 pt-4">
        <div className="elevate-lg overflow-hidden rounded-2xl border border-border bg-card sm:flex sm:items-center sm:justify-between">
          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <h2 className="font-display text-[clamp(1.5rem,3.5vw,2.25rem)] text-foreground">
              Tu identidad en cada torneo
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Subí tu logo, elegí los colores de tu club y sumá tu dirección. La
              app y las imágenes que compartís —torneo, calendario y campeón—
              quedan con tu sello.
            </p>
          </div>
          {/* Muestra de paletas de marca disponibles */}
          <div className="flex gap-2 px-6 pb-8 sm:px-10 sm:py-10">
            {['#2d52e8', '#0e9c77', '#e2620e', '#dc2e3e', '#0e8fa8', '#646e80'].map(
              (c) => (
                <span
                  key={c}
                  className="size-9 rounded-full border border-border"
                  style={{ backgroundColor: c }}
                  aria-hidden
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* ============================== JUGADORES ============================== */}
      <section className="mt-10 border-t border-border pt-14 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-volt">
          Para jugadores
        </p>
        <h2 className="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] text-foreground">
          Encontrá con quién jugar
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          El tablero de turnos vive donde ya están los jugadores: tu grupo de
          WhatsApp. Sin cuenta, sin instalar nada.
        </p>

        <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-3">
          <PlayerStep
            n="1"
            title="Publicás sin cuenta"
            desc="Cargás cancha, día, hora y cuántos faltan. Treinta segundos."
          />
          <PlayerStep
            n="2"
            title="Compartís el link"
            desc="Lo tirás en tu grupo de WhatsApp con un toque."
          />
          <PlayerStep
            n="3"
            title="Te contactan"
            desc="Quien tenga ganas te escribe directo por WhatsApp."
          />
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/turnos/nuevo"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'font-display h-12 px-6 text-base'
            )}
          >
            Publicar un turno →
          </Link>
          <Link
            href="/turnos"
            className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            O mirá quién busca gente
          </Link>
        </div>
      </section>

      {/* Próximamente */}
      <section className="mt-14 border-t border-border py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] text-foreground">
            Lo que se viene
          </h2>
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Próximamente
          </span>
        </div>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Matchpoint arranca por los organizadores, pero el norte es la
          comunidad. Esto es lo que estamos construyendo.
        </p>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          <RoadmapRow
            title="Perfiles y rankings"
            desc="Cada jugador con su historial, sus números y su ranking. Lo que cargás hoy ya alimenta ese perfil."
          />
          <RoadmapRow
            title="Reserva de turnos"
            desc="Tus canchas con disponibilidad y reservas, en el mismo lugar."
          />
          <RoadmapRow
            title="Transmisión en vivo"
            desc="Transmití los partidos de tu club, directo desde la app."
          />
        </ul>
      </section>

      {/* CTA de cierre — una sola banda, el momento de color de la página */}
      <section className="pb-12">
        <div className="elevate-lg rounded-2xl bg-volt px-6 py-10 text-volt-foreground sm:px-12 sm:py-14">
          <h2 className="font-display text-[clamp(1.75rem,4.5vw,3rem)]">
            ¿Organizás o jugás?
          </h2>
          <p className="mt-3 max-w-xl text-sm text-volt-foreground/85">
            Empezá por donde estés: crear un torneo o publicar un turno lleva un
            minuto. Gratis, sin vueltas.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="font-display inline-flex h-12 items-center rounded-md bg-white px-6 text-base text-volt transition-colors hover:bg-white/90"
            >
              Organizo torneos →
            </Link>
            <Link
              href="/turnos"
              className="inline-flex h-12 items-center rounded-md border border-white/40 px-6 text-base font-medium text-volt-foreground transition-colors hover:bg-white/10"
            >
              Busco con quién jugar
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8">
        <div className="flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span className="font-display text-sm text-foreground">
            Match<span className="text-volt">point</span>
          </span>
          <span>
            © {year} Matchpoint · Hecho para la comunidad de pádel.
          </span>
        </div>
      </footer>
    </main>
  )
}

/* --------------------------- piezas de la home --------------------------- */

/** Fila del mini tablero de turnos del hero (mock estático, decorativo). */
function BoardRow({
  court,
  missing,
  when,
}: {
  court: string
  missing: string
  when: string
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{court}</p>
        <p className="text-xs text-muted-foreground">
          {missing} ·{' '}
          <span className="font-mono tnum font-bold">{when}</span>
        </p>
      </div>
      <span className="shrink-0 rounded-md bg-volt px-2.5 py-1.5 text-xs font-semibold text-volt-foreground">
        WhatsApp
      </span>
    </div>
  )
}

/** Paso del ciclo de vida del torneo (secuencia real, por eso numerada). */
function LifecycleStep({
  n,
  title,
  desc,
}: {
  n: string
  title: string
  desc: string
}) {
  return (
    <li className="flex gap-5 py-4">
      <span className="font-mono tnum pt-0.5 text-sm font-bold text-volt">
        {n}
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </li>
  )
}

/** Paso del "cómo funciona" del tablero de turnos. */
function PlayerStep({
  n,
  title,
  desc,
}: {
  n: string
  title: string
  desc: string
}) {
  return (
    <li className="border-t border-border pt-4">
      <span className="font-mono tnum text-2xl font-bold text-volt">{n}</span>
      <h3 className="mt-2 text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </li>
  )
}

/** Fila de roadmap ("lo que se viene"). */
function RoadmapRow({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="grid gap-1 py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </li>
  )
}

/* ------------------------------- íconos ------------------------------- */

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function ShareIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}
