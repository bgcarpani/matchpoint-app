import { z } from 'zod'

/**
 * Validación de un turno del Tablero de turnos (`/turnos`). Ver `spec-turnos.md`.
 * El formulario manda fecha + hora combinadas como ISO; el WhatsApp llega ya sin
 * prefijo pero se re-normaliza server-side por las dudas (ver `normalizeWhatsapp`).
 */
export const shiftSchema = z.object({
  court_name: z
    .string()
    .trim()
    .min(2, 'Poné el nombre de la cancha o club')
    .max(100, 'Nombre demasiado largo'),
  start_time: z.iso.datetime({ message: 'Fecha u hora inválida' }),
  slots_needed: z.number().int().min(1).max(4),
  category: z.string().trim().max(60, 'Categoría demasiado larga').optional(),
  notes: z.string().trim().max(140, 'Máximo 140 caracteres').optional(),
  creator_name: z
    .string()
    .trim()
    .min(2, 'Poné tu nombre')
    .max(60, 'Nombre demasiado largo'),
  whatsapp: z
    .string()
    .regex(/^\d{8,15}$/, 'Ingresá un WhatsApp válido (solo números)'),
  instagram: z.string().trim().max(30, 'Usuario demasiado largo').optional(),
})

export type ShiftInput = z.infer<typeof shiftSchema>

/**
 * Normaliza un WhatsApp a dígitos crudos sin prefijo de país argentino:
 * quita espacios, guiones, paréntesis, `+`, y el prefijo `54`/`549` inicial.
 * El deep link `wa.me` le antepone `549` (Argentina + móvil).
 */
export function normalizeWhatsapp(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('549')) digits = digits.slice(3)
  else if (digits.startsWith('54')) digits = digits.slice(2)
  return digits
}

/** Normaliza un handle de Instagram: saca `@`, espacios y una URL si la pegaron. */
export function normalizeInstagram(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .trim()
}
