'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@/lib/validation/auth'

type ActionResult = { error: string } | void

/** Traduce los errores más comunes de Supabase Auth a es-AR. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ya existe una cuenta con ese email.'
  if (m.includes('invalid login credentials'))
    return 'Email o contraseña incorrectos.'
  if (m.includes('password')) return 'La contraseña no cumple los requisitos.'
  if (m.includes('email')) return 'Revisá el email ingresado.'
  return 'No se pudo completar la operación. Probá de nuevo.'
}

export async function registerOrganizer(
  values: RegisterInput
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const { email, password, full_name, establishment_name } = parsed.data
  const supabase = await createClient()

  // La fila en `organizers` la crea el trigger handle_new_user a partir
  // de esta metadata (ver migración 0003).
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, establishment_name } },
  })

  if (error) return { error: translateAuthError(error.message) }
  redirect('/dashboard')
}

export async function loginOrganizer(values: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: translateAuthError(error.message) }
  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
