import { z } from 'zod'

export const courtSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ingresá un nombre')
    .max(60, 'Máximo 60 caracteres'),
  type: z.enum(['indoor', 'outdoor']),
})

export type CourtInput = z.infer<typeof courtSchema>
