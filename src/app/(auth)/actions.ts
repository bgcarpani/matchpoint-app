'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type UpdatePasswordInput,
} from '@/lib/validation/auth'

type ActionResult = { error: string } | void
type ActionOk = { error: string } | { ok: true }

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
): Promise<ActionOk> {
  const parsed = registerSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const { email, password, full_name, establishment_name } = parsed.data
  const supabase = await createClient()
  const baseUrl = await getBaseUrl()

  // La fila en `organizers` la crea el trigger handle_new_user a partir
  // de esta metadata (ver migración 0003).
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, establishment_name },
      // Con mailer_autoconfirm=false, el link de confirmación llega por mail
      // y vuelve a /auth/confirm, que valida el token y deja la sesión activa.
      emailRedirectTo: `${baseUrl}/auth/confirm`,
    },
  })

  if (error) return { error: translateAuthError(error.message) }

  // Defensa: con mailer_autoconfirm=false signUp NO crea sesión, pero si la
  // config de Supabase tiene autoconfirm=true (estado TEMPORAL en prod) signUp
  // deja una sesión activa de inmediato. La pantalla de "revisá tu email" asume
  // que NO hay sesión; si la dejáramos abierta, "Ingresar" rebotaría al
  // dashboard (proxy redirige authenticated→/dashboard) logueado sin confirmar.
  // signOut es no-op cuando no hay sesión, así que es seguro en ambos casos.
  await supabase.auth.signOut()

  // No redirigimos: el form muestra "revisá tu email para confirmar tu cuenta".
  return { ok: true }
}

export async function requestPasswordReset(
  values: ForgotPasswordInput
): Promise<ActionOk> {
  const parsed = forgotPasswordSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const supabase = await createClient()
  const baseUrl = await getBaseUrl()

  // El link de recovery vuelve a /auth/confirm (type=recovery), que valida el
  // token, deja la sesión de recuperación activa y redirige a /update-password.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/auth/confirm?next=/update-password`,
  })

  // Respondemos siempre ok para no filtrar qué emails están registrados.
  return { ok: true }
}

export async function updatePassword(
  values: UpdatePasswordInput
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  // Requiere la sesión de recuperación que dejó activa /auth/confirm.
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
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
