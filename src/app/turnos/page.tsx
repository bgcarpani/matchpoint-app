import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  PUBLIC_SHIFT_COLUMNS,
  expiryCutoffISO,
  type PublicShift,
} from '@/lib/domain/shift'
import { ShiftCard } from './components/shift-card'
import { ShiftFilters, type DateFilter } from './components/shift-filters'

export const revalidate = 60

/** Rango [desde, hasta) sobre `start_time` según el filtro de fecha. */
function dateRange(filter: DateFilter, now: Date): { from: string; to?: string } {
  const cutoff = expiryCutoffISO(now)
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  if (filter === 'manana') {
    const t = new Date(now)
    t.setDate(t.getDate() + 1)
    return { from: startOfDay(t).toISOString(), to: endOfDay(t).toISOString() }
  }
  if (filter === 'semana') {
    // Hasta el domingo de esta semana (lunes primero); si hoy es domingo, hoy.
    const daysToSunday = (7 - now.getDay()) % 7
    const sunday = new Date(now)
    sunday.setDate(sunday.getDate() + daysToSunday)
    return { from: cutoff, to: endOfDay(sunday).toISOString() }
  }
  // hoy (default)
  return { from: cutoff, to: endOfDay(now).toISOString() }
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; slots?: string }>
}) {
  const { date, slots } = await searchParams
  const dateFilter: DateFilter =
    date === 'manana' || date === 'semana' ? date : 'hoy'

  const now = new Date()
  const { from, to } = dateRange(dateFilter, now)

  const supabase = await createClient()
  let query = supabase
    .from('shifts')
    .select(PUBLIC_SHIFT_COLUMNS)
    .neq('status', 'closed')
    .gte('start_time', from)
    .order('start_time', { ascending: true })

  if (to) query = query.lte('start_time', to)
  if (slots && /^[1-4]$/.test(slots))
    query = query.eq('slots_needed', Number(slots))

  const { data } = await query
  const shifts = (data ?? []) as PublicShift[]

  // Los turnos completos van al fondo (manteniendo el orden por proximidad).
  const open = shifts.filter((s) => s.status !== 'full')
  const full = shifts.filter((s) => s.status === 'full')
  const ordered = [...open, ...full]

  return (
    <main>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            Tablero de turnos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Encontrá compañeros para tu próximo partido.
          </p>
        </div>
        <Link
          href="/turnos/nuevo"
          className="font-display shrink-0 rounded-lg bg-volt px-4 py-2.5 text-sm text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105"
        >
          + Publicar turno
        </Link>
      </div>

      <div className="mt-8">
        <ShiftFilters />
      </div>

      {ordered.length === 0 ? (
        <div className="elevate mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg text-foreground">
            No hay turnos publicados
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {dateFilter === 'hoy'
              ? 'Todavía nadie publicó un turno para hoy.'
              : 'Nadie publicó turnos para este período.'}{' '}
            ¿Tenés una cancha con lugares?
          </p>
          <Link
            href="/turnos/nuevo"
            className="font-display mt-5 inline-flex rounded-lg bg-volt px-4 py-2.5 text-sm text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105"
          >
            Publicá el tuyo →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4">
          {ordered.map((s) => (
            <ShiftCard key={s.id} shift={s} />
          ))}
        </ul>
      )}
    </main>
  )
}
