import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { canManageRegistrations } from '@/lib/domain/tournament'
import {
  RegistrationTable,
  type RegistrationRow,
} from '@/components/tournaments/registration-table'
import { AddPairForm } from '@/components/tournaments/add-pair-form'

export const metadata: Metadata = { title: 'Inscripciones — Matchpoint' }

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: organizer }, { data: tournament }, { data: pairs }] =
    await Promise.all([
      supabase
        .from('organizers')
        .select('establishment_name, theme_key, logo_path')
        .eq('id', user.id)
        .single(),
      supabase
        .from('tournaments')
        .select('id, name, status, max_pairs, max_pair_requests')
        .eq('id', id)
        .single(),
      // RLS (pairs_all_owner) limita a las parejas de torneos del organizador.
      supabase
        .from('pairs')
        .select(
          'id, status, created_at, player1_id, player2_id, lookup_token, deposit_paid_at'
        )
        .eq('tournament_id', id)
        .order('created_at', { ascending: true }),
    ])

  if (!tournament) notFound()

  // Traer los players de todas las parejas en una sola consulta.
  const pairList = pairs ?? []
  const playerIds = pairList.flatMap((p) => [p.player1_id, p.player2_id])
  const { data: players } = playerIds.length
    ? await supabase
        .from('players')
        .select('id, full_name, email, phone, dni')
        .in('id', playerIds)
    : { data: [] }

  const byId = new Map((players ?? []).map((p) => [p.id, p]))
  const empty = { full_name: '—', email: null, phone: null, dni: null }
  const rows: RegistrationRow[] = pairList.map((p) => ({
    id: p.id,
    status: p.status,
    created_at: p.created_at,
    lookup_token: p.lookup_token,
    deposit_paid_at: p.deposit_paid_at,
    player1: byId.get(p.player1_id) ?? empty,
    player2: byId.get(p.player2_id) ?? empty,
  }))

  const baseUrl = await getBaseUrl()

  const accepted = rows.filter((r) => r.status === 'accepted').length
  // El cupo de solicitudes cuenta solo pendientes: aceptar/rechazar libera lugar.
  const requested = rows.filter((r) => r.status === 'pending').length

  return (
    <div className="relative z-[2] mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <OrganizerHeader establishmentName={organizer?.establishment_name} themeKey={organizer?.theme_key} logoPath={organizer?.logo_path} />

      <section className="mt-10">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al torneo
        </Link>
        <h1 className="font-display mt-4 text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Inscripciones
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{tournament.name}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <Stat
            label="Aceptadas"
            value={accepted}
            total={tournament.max_pairs}
          />
          <Stat
            label="Solicitudes"
            value={requested}
            total={tournament.max_pair_requests}
          />
        </div>

        {canManageRegistrations(tournament.status) ? (
          <div className="mt-8">
            <AddPairForm tournamentId={tournament.id} />
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
            El torneo está {tournament.status === 'finished' ? 'finalizado' : 'en curso'}: las
            inscripciones quedaron congeladas y no se pueden modificar.
          </p>
        )}

        <div className="mt-8">
          <RegistrationTable
            rows={rows}
            tournamentName={tournament.name}
            baseUrl={baseUrl}
            locked={!canManageRegistrations(tournament.status)}
          />
        </div>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-2 text-2xl text-foreground tnum">
        {value}
        <span className="text-muted-foreground">/{total}</span>
      </p>
    </div>
  )
}
