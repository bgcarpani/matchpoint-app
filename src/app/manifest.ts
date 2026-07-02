import type { MetadataRoute } from 'next'

/**
 * Web App Manifest (PWA). Next 16 lo sirve en `/manifest.webmanifest` y auto-inyecta
 * el `<link rel="manifest">`. Habilita "Agregar a pantalla de inicio", ícono propio,
 * splash y modo standalone (pantalla completa sin barra del navegador).
 *
 * Los colores coinciden con el tema (azul noche `--background: #0B1220`).
 * Íconos en `public/icon.svg` (any) + `public/icon-maskable.svg` (con safe-zone).
 * El apple-touch-icon (iOS no lee el manifest) se genera en `src/app/apple-icon.tsx`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MatchUp — Torneos de pádel',
    short_name: 'MatchUp',
    description:
      'Gestión y descubrimiento de torneos de pádel para la comunidad: inscribí tu pareja y seguí las zonas.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B1220',
    theme_color: '#0B1220',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      {
        src: '/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
