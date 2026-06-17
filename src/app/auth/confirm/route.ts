/**
 * Confirmación de email y recovery de contraseña (Supabase Auth, SSR).
 *
 * Los mails de Auth (confirmación de cuenta y "olvidé mi contraseña") apuntan a
 * esta ruta con `token_hash` + `type`. Validamos el token con `verifyOtp`, lo
 * que deja la sesión activa (cookies vía el server client), y redirigimos:
 *   - signup     → /dashboard (o `next`)
 *   - recovery   → /update-password (vía `next` del link de reset)
 *
 * Next 16: los params llegan por querystring (no `params` async acá), pero se
 * usa `redirect()` para que las cookies seteadas por verifyOtp se propaguen.
 */
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) redirect(next)
  }

  // Token inválido o expirado → de vuelta al login con aviso.
  redirect('/login?error=auth')
}
