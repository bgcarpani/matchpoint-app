import { z } from 'zod'

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Ingresá tu nombre'),
    establishment_name: z
      .string()
      .trim()
      .min(2, 'Ingresá el nombre del establecimiento'),
    email: z.email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('Email inválido'),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
