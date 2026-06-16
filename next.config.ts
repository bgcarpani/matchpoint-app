import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

/**
 * PWA vía Serwist. El service worker se compila desde `src/app/sw.ts` a
 * `public/sw.js`. Serwist usa el bundler webpack (todavía no Turbopack), por eso
 * `npm run build` corre con `--webpack` (ver package.json). En desarrollo el SW
 * queda deshabilitado, así que `npm run dev` puede seguir con Turbopack; para
 * probar el SW/offline usar `npm run build && npm run start`.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  // Permite que el JS de dev (HMR, Server Actions) se sirva cuando la app se
  // accede desde fuera de localhost: túnel de Cloudflare (probar en el celu) y
  // la IP de la LAN. Sin esto Next bloquea los recursos cross-origin y el form
  // de login cae a un GET nativo en vez de ejecutar el Server Action.
  allowedDevOrigins: ['*.trycloudflare.com', '192.168.1.88'],
}

export default withSerwist(nextConfig)
