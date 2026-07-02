import type { MetadataRoute } from 'next'

/**
 * Web App Manifest (PWA). Next 16 lo sirve en `/manifest.webmanifest` y auto-inyecta
 * el `<link rel="manifest">`. Habilita "Agregar a pantalla de inicio", ícono propio,
 * splash y modo standalone (pantalla completa sin barra del navegador).
 *
 * Los colores coinciden con el tema claro "Court Side" (fondo `--background: #e7ebf2`,
 * acento `--volt: #2d52e8`).
 * Íconos en `public/icon.svg` (any) + `public/icon-maskable.svg` (con safe-zone).
 * El apple-touch-icon (iOS no lee el manifest) se genera en `src/app/apple-icon.tsx`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MatchUp — Torneos y turnos de pádel',
    short_name: 'MatchUp',
    description:
      'Organizá torneos de pádel o encontrá con quién jugar: inscribí tu pareja, seguí las zonas y publicá turnos con lugares vacíos.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#e7ebf2',
    theme_color: '#2d52e8',
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
