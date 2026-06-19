/**
 * Middleware raíz — refresca la sesión de Supabase en cada request y aplica
 * control optimista de acceso al área del organizador.
 *
 * NOTA (deploy Cloudflare): Next 16 renombró Middleware → Proxy, pero el Proxy
 * corre **solo** en runtime Node.js, y el adapter `@opennextjs/cloudflare` aún
 * NO soporta Node middleware (opennextjs-cloudflare#962): aborta el build con
 * "Node.js middleware is not currently supported". Por eso se mantiene el nombre
 * legacy `middleware.ts` + export `middleware`, que Next 16 todavía emite como
 * **edge middleware** (lo único que OpenNext acepta). Revisar si OpenNext agrega
 * soporte de Node middleware para volver a `proxy.ts`.
 */
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - api (las route handlers validan auth por su cuenta vía RLS)
     * - _next/static, _next/image (assets)
     * - favicon.ico y archivos estáticos comunes
     * - sw.js y manifest.webmanifest (assets de la PWA, sin lógica de auth)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
