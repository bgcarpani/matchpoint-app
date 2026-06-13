import { z } from 'zod'
import { isValidCategoryValue } from '@/lib/domain/tournament'

/**
 * Schema completo (validación server-side). Los cupos llegan como string desde
 * el form y se coercionan a number. Valida categoría según tipo y la regla
 * cupos de solicitud ≥ cupos de torneo.
 */
export const tournamentSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresá un nombre'),
    category_type: z.enum(['individual', 'suma']),
    category_value: z.string().trim().min(1, 'Elegí la categoría'),
    gender: z.enum(['male', 'female', 'mixed']),
    tournament_date: z.string().trim().min(1, 'Elegí una fecha'),
    registration_opens_at: z.string().trim().nullable().optional(),
    max_pairs: z.coerce.number().int().positive('Debe ser mayor a 0'),
    max_pair_requests: z.coerce.number().int().positive('Debe ser mayor a 0'),
    scoring_mode: z.enum(['games', 'best_of_3_sets']),
    games_per_set: z.coerce
      .number()
      .int()
      .refine((v) => v === 6 || v === 7, 'El set es a 6 o 7 games'),
  })
  .refine((d) => isValidCategoryValue(d.category_type, d.category_value), {
    message: 'Categoría inválida para el tipo elegido',
    path: ['category_value'],
  })
  .refine((d) => d.max_pair_requests >= d.max_pairs, {
    message: 'Las solicitudes deben ser ≥ los cupos del torneo',
    path: ['max_pair_requests'],
  })

export type TournamentInput = z.input<typeof tournamentSchema>

/**
 * Schema de los campos manejados por react-hook-form (todo string, sin coerce
 * para evitar fricción con RHF). La categoría/género y las fechas (date picker)
 * se manejan con estado local en el form. La validación definitiva la hace
 * tournamentSchema en la action.
 */
const intString = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Ingresá un número')
  .refine((v) => Number(v) > 0, 'Debe ser mayor a 0')

export const tournamentFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresá un nombre'),
    max_pairs: intString,
    max_pair_requests: intString,
  })
  .refine((d) => Number(d.max_pair_requests) >= Number(d.max_pairs), {
    message: 'Las solicitudes deben ser ≥ los cupos del torneo',
    path: ['max_pair_requests'],
  })

export type TournamentFormFields = z.infer<typeof tournamentFormSchema>
