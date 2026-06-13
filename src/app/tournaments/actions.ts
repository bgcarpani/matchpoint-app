'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/supabase/auth'
import {
  tournamentSchema,
  type TournamentFormFields,
} from '@/lib/validation/tournament'
import { nextStatus } from '@/lib/domain/tournament'
import type { CategoryType, Gender, ScoringMode } from '@/lib/types/database'

export type ActionResult = { error: string } | { ok: true }

/** Lo que envía el form: campos RHF (string) + categoría/género + fechas (estado local). */
export interface TournamentPayload extends TournamentFormFields {
  category_type: CategoryType
  category_value: string
  gender: Gender
  tournament_date: string
  registration_opens_at: string | null
  scoring_mode: ScoringMode
  games_per_set: number
}

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'Datos inválidos.'
}

/** datetime-local ('YYYY-MM-DDTHH:mm', hora local) o vacío → ISO o null. */
function normalizeRegistrationOpensAt(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function createTournament(
  payload: TournamentPayload
): Promise<ActionResult> {
  const parsed = tournamentSchema.safeParse(payload)
  if (!parsed.success) return { error: firstError(parsed.error) }

  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      organizer_id: user.id,
      name: parsed.data.name,
      status: 'draft',
      category_type: parsed.data.category_type,
      category_value: parsed.data.category_value,
      gender: parsed.data.gender,
      tournament_date: parsed.data.tournament_date,
      registration_opens_at: normalizeRegistrationOpensAt(
        parsed.data.registration_opens_at
      ),
      max_pairs: parsed.data.max_pairs,
      max_pair_requests: parsed.data.max_pair_requests,
      scoring_mode: parsed.data.scoring_mode,
      games_per_set: parsed.data.games_per_set,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'No se pudo crear el torneo.' }

  revalidatePath('/dashboard')
  redirect(`/tournaments/${data.id}`)
}

export async function updateTournament(
  id: string,
  payload: TournamentPayload
): Promise<ActionResult> {
  const parsed = tournamentSchema.safeParse(payload)
  if (!parsed.success) return { error: firstError(parsed.error) }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('tournaments')
    .update({
      name: parsed.data.name,
      category_type: parsed.data.category_type,
      category_value: parsed.data.category_value,
      gender: parsed.data.gender,
      tournament_date: parsed.data.tournament_date,
      registration_opens_at: normalizeRegistrationOpensAt(
        parsed.data.registration_opens_at
      ),
      max_pairs: parsed.data.max_pairs,
      max_pair_requests: parsed.data.max_pair_requests,
      scoring_mode: parsed.data.scoring_mode,
      games_per_set: parsed.data.games_per_set,
    })
    .eq('id', id)

  if (error) return { error: 'No se pudo actualizar el torneo.' }

  revalidatePath(`/tournaments/${id}`)
  revalidatePath('/dashboard')
  redirect(`/tournaments/${id}`)
}

export async function advanceTournamentStatus(
  id: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { data: current, error: readErr } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', id)
    .single()

  if (readErr || !current) return { error: 'Torneo no encontrado.' }

  const next = nextStatus(current.status)
  if (!next) return { error: 'El torneo ya está finalizado.' }

  const { error } = await supabase
    .from('tournaments')
    .update({ status: next })
    .eq('id', id)
  if (error) return { error: 'No se pudo avanzar el estado.' }

  revalidatePath(`/tournaments/${id}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function deleteTournament(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { data: current, error: readErr } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', id)
    .single()

  if (readErr || !current) return { error: 'Torneo no encontrado.' }
  if (current.status !== 'draft')
    return { error: 'Solo se puede eliminar un torneo en borrador.' }

  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar el torneo.' }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
