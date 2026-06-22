import { z } from 'zod'

/**
 * Validación del perfil de organización (v3.2, ver spec-v3-2.md A.6).
 * El logo no va acá: se sube directo a Storage desde el cliente y se persiste
 * con una action aparte. Esto valida los campos editables del form.
 */
export const settingsSchema = z.object({
  address: z.string().trim().max(200, 'Máximo 200 caracteres.'),
  // URL opcional: o vacío, o un link válido (con esquema).
  maps_url: z.union([
    z.literal(''),
    z.url('Link inválido (incluí https://).').max(500),
  ]),
  theme_key: z.enum(['royal', 'pista', 'clay', 'match', 'aqua', 'grafito']),
})

export type SettingsInput = z.infer<typeof settingsSchema>
