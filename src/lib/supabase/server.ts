/**
 * Cliente Supabase para el servidor (Server Components, Route Handlers, Server Actions).
 * Usa la anon key + las cookies de sesión → las operaciones respetan RLS y
 * actúan como el organizador autenticado.
 *
 * Next 16: `cookies()` es asíncrono → este factory es async.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Llamado desde un Server Component: ignorar.
            // El refresco de sesión lo maneja `proxy.ts`.
          }
        },
      },
    }
  )
}
