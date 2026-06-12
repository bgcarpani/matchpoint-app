import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <main className="relative z-[2] mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Ingresar
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center py-16">
        <p className="text-xs uppercase tracking-[0.24em] text-volt">
          Comunidad de pádel
        </p>
        <h1 className="font-display mt-5 text-[clamp(3rem,11vw,8rem)] text-foreground">
          Organizá tu
          <br />
          torneo
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">
          Creá torneos, gestioná inscripciones de parejas y armá las zonas.
          Todo en un solo lugar, pensado para organizadores.
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
    </main>
  )
}
