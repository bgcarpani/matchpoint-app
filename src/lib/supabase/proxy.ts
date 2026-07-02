/**
 * Refresco de sesión Supabase para `proxy.ts` (antes "middleware" en Next ≤15).
 *
 * Patrón oficial @supabase/ssr adaptado a Next 16:
 *   - Lee/escribe cookies sobre la request/response del proxy.
 *   - Llama a `getUser()` para refrescar el token si hace falta.
 *   - Hace un control OPTIMISTA de acceso (redirección). La autorización real
 *     se valida en cada Route Handler/Server Component vía RLS (ver docs Next 16:
 *     proxy no debe ser la única capa de auth).
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

// Prefijos que requieren sesión de organizador.
const PROTECTED_PREFIXES = ['/dashboard', '/courts', '/tournaments', '/settings']

// Rutas de auth: si ya hay sesión, redirigir al dashboard.
const AUTH_ROUTES = ['/login', '/register']

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Antes de conectar Supabase (sin .env.local) el proxy no debe romper:
  // se comporta como no-op hasta que existan las credenciales.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response
  }

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  // Rutas públicas (landing, /turnos, /t/*, /o/*): no usan la sesión, así que
  // evitamos el round-trip a Supabase Auth (`getUser()`) en cada request — con
  // sesión activa agregaba cientos de ms a páginas que no la necesitan. El
  // refresh del token queda a cargo de las rutas protegidas/de auth (la
  // protección real sigue siendo RLS + requireUser() en cada página).
  if (!isProtected && !isAuthRoute) {
    return response
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no insertar lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
