/**
 * Proxy raíz (Next 16) — refresca la sesión de Supabase en cada request
 * y aplica control optimista de acceso al área del organizador.
 */
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - api (las route handlers validan auth por su cuenta vía RLS)
     * - _next/static, _next/image (assets)
     * - favicon.ico y archivos estáticos comunes
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
