/**
 * Construcción de URLs absolutas, centralizada.
 *
 * Reemplaza el patrón proto/host duplicado inline en páginas server
 * (dashboard, tournaments/[id]). Útil para links de emails y share donde se
 * necesita una URL absoluta que funcione en local y producción.
 */
import { headers } from 'next/headers'

/**
 * URL base absoluta (ej. `https://matchup.app` o `http://localhost:3000`).
 *
 * Prioriza los headers del request entrante (proto/host reales detrás del
 * proxy de Cloudflare). Cae a `NEXT_PUBLIC_SITE_URL` cuando no hay request
 * (route handlers de edge, generación de OG, etc.).
 */
export async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get('host')
    if (host) {
      const proto =
        h.get('x-forwarded-proto') ??
        (host.startsWith('localhost') ? 'http' : 'https')
      return `${proto}://${host}`
    }
  } catch {
    // headers() lanza fuera de un scope de request → usar el fallback.
  }

  const fallback = process.env.NEXT_PUBLIC_SITE_URL
  if (fallback) return fallback.replace(/\/$/, '')

  // Último recurso para dev: evita romper si falta la env.
  return 'http://localhost:3000'
}
