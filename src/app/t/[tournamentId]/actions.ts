'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  registerPairSchema,
  type RegisterPairInput,
} from '@/lib/validation/registration'
import { sendEmail } from '@/lib/email/send'
import { pendingEmail } from '@/lib/email/templates'
import { getBaseUrl } from '@/lib/url'

export type RegisterResult = { error: string } | { token: string }

// Mapea las excepciones de register_pair (migración 0004) a mensajes es-AR.
function translateRpcError(message: string): string {
  if (message.includes('REGISTRATION_CLOSED'))
    return 'La inscripción no está abierta para este torneo.'
  if (message.includes('REQUESTS_FULL'))
    return 'Se alcanzó el cupo de solicitudes para este torneo.'
  if (message.includes('DUPLICATE_EMAIL'))
    return 'Ya hay una inscripción vigente en este torneo con ese email.'
  if (message.includes('TOURNAMENT_NOT_FOUND'))
    return 'No se encontró el torneo.'
  if (message.includes('players_contact_present'))
    return 'Cada jugador necesita email o teléfono.'
  return 'No se pudo enviar la solicitud. Intentá de nuevo.'
}

export async function registerPair(
  input: RegisterPairInput
): Promise<RegisterResult> {
  const parsed = registerPairSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }
  const { tournament_id, player1, player2 } = parsed.data

  // La inscripción pública corre con service-role: la RPC valida estado + cupo
  // de forma atómica (bloquea la fila del torneo) y devuelve el lookup_token.
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('register_pair', {
    p_tournament_id: tournament_id,
    p1_full_name: player1.full_name,
    p1_email: player1.email,
    p1_phone: player1.phone,
    p1_dni: player1.dni,
    p2_full_name: player2.full_name,
    p2_email: player2.email,
    p2_phone: player2.phone,
    p2_dni: player2.dni,
  })

  if (error) return { error: translateRpcError(error.message) }
  if (!data) return { error: 'No se pudo generar la inscripción.' }

  // Mail de "solicitud pendiente" al jugador 1 (contacto principal). Best-effort:
  // sendEmail no lanza, así que un fallo de envío nunca rompe la inscripción.
  if (player1.email) {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournament_id)
      .maybeSingle()

    const baseUrl = await getBaseUrl()
    const { subject, html } = pendingEmail({
      playerName: player1.full_name,
      tournamentName: tournament?.name ?? 'tu torneo',
      trackUrl: `${baseUrl}/inscription/${data}`,
    })
    await sendEmail({ to: player1.email, subject, html })
  }

  // Refresca los conteos de la página pública.
  revalidatePath(`/t/${tournament_id}`)
  return { token: data }
}
