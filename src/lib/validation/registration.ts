import { z } from 'zod'

/**
 * Validación de inscripción de pareja (pública).
 * Regla del modelo (players_contact_present): cada jugador necesita nombre y al
 * menos un contacto (email o teléfono). El email, si se carga, debe ser válido.
 */
const optionalEmail = z
  .union([z.literal(''), z.email('Email inválido')])
  .transform((v) => v.trim())

const playerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, 'Falta el nombre del jugador')
      .max(80, 'Nombre demasiado largo'),
    email: optionalEmail,
    phone: z.string().trim().max(40, 'Teléfono demasiado largo'),
    dni: z.string().trim().max(40, 'Identificador demasiado largo'),
  })
  .refine((p) => p.email.length > 0 || p.phone.length > 0, {
    message: 'Cada jugador necesita email o teléfono',
    path: ['email'],
  })

export const registerPairSchema = z.object({
  tournament_id: z.uuid(),
  player1: playerSchema,
  player2: playerSchema,
})

export type PlayerFields = z.infer<typeof playerSchema>
export type RegisterPairInput = z.infer<typeof registerPairSchema>
