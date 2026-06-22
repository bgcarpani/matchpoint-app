import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ShowcaseCarousel } from '@/components/landing/showcase-carousel'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <main className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 sm:px-8">
      {/* Solo el logo: los CTAs (Ingresar / Crear cuenta) viven en el hero para no duplicarlos. */}
      <header className="flex items-center py-6">
        <span className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </span>
      </header>

      <div className="grid flex-1 items-center gap-10 py-12 xl:grid-cols-[1fr_minmax(320px,400px)] xl:py-16">
        {/* Texto */}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-volt">
            Comunidad de pádel
          </p>
          <h1 className="font-display mt-5 text-[clamp(2rem,6vw,3.75rem)] leading-[0.92] text-foreground">
            Gestioná tu
            <br />
            organización
          </h1>
          <p className="mt-6 max-w-md text-base text-muted-foreground">
            Inscripciones, zonas, partidos y llaves. Todo en un solo lugar,
            pensado para organizadores.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
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

        {/* Visual: carousel del producto (llaves, posiciones, calendario, campeón) */}
        <ShowcaseCarousel />
      </div>

      {/* Lo que hacés hoy */}
      <section className="pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-volt">
          Lo que hacés hoy
        </p>
        <h2 className="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] text-foreground">
          Un torneo, de principio a fin
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Inscripciones"
            desc="Las parejas se anotan solas; vos aceptás o rechazás."
            icon={<ClipboardIcon />}
          />
          <FeatureCard
            title="Zonas y partidos"
            desc="Generás zonas al azar y armás el fixture round-robin."
            icon={<GridIcon />}
          />
          <FeatureCard
            title="Resultados y posiciones"
            desc="Cargás los resultados y la tabla se ordena sola."
            icon={<ChartIcon />}
          />
          <FeatureCard
            title="Llaves y campeón"
            desc="Cuadro de eliminación directa hasta la final."
            icon={<TrophyIcon />}
          />
          <FeatureCard
            title="Calendario público + QR"
            desc="Un link y un QR para pegar en el club; se actualiza solo."
            icon={<CalendarIcon />}
          />
          <FeatureCard
            title="Compartir"
            desc="Torneo, calendario y campeón a WhatsApp e Instagram."
            icon={<ShareIcon />}
          />
        </div>
      </section>

      {/* Próximamente */}
      <section className="mt-14 border-t border-border py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Próximamente
        </p>
        <h2 className="font-display mt-3 text-[clamp(1.75rem,4vw,2.75rem)] text-foreground">
          Lo que se viene
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Matchpoint arranca por los organizadores, pero el norte es la
          comunidad. Esto es lo que estamos construyendo.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <ComingSoonCard
            title="Perfiles y rankings"
            desc="Cada jugador con su historial, sus números y su ranking. Lo que cargás hoy ya alimenta ese perfil."
          />
          <ComingSoonCard
            title="Reserva de turnos"
            desc="Tus canchas con disponibilidad y reservas, en el mismo lugar."
          />
          <ComingSoonCard
            title="Transmisión en vivo"
            desc="Transmití los partidos de tu club, directo desde la app."
          />
        </div>
      </section>

      {/* CTA de cierre */}
      <section className="pb-20">
        <div className="elevate-lg flex flex-col items-start gap-5 rounded-2xl border border-border bg-card px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] text-foreground">
              Armá tu próximo torneo
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gratis para empezar. Sin planillas ni grupos de WhatsApp.
            </p>
          </div>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'font-display h-12 shrink-0 px-6 text-base'
            )}
          >
            Crear cuenta →
          </Link>
        </div>
      </section>
    </main>
  )
}

/* --------------------------- piezas de la home --------------------------- */

function FeatureCard({
  title,
  desc,
  icon,
}: {
  title: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <div className="elevate rounded-2xl border border-border bg-card p-5">
      <span className="text-volt">{icon}</span>
      <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  )
}

/** Tarjeta de roadmap: feature futuro, marcado con chip neutro "Próximamente". */
function ComingSoonCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5">
      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Próximamente
      </span>
      <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  )
}

/* ------------------------------- íconos ------------------------------- */

function ClipboardIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function GridIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function TrophyIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  )
}

function ChartIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <path d="M4 20h16M7 20v-6M12 20V8M17 20v-9" />
    </svg>
  )
}

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

