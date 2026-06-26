/**
 * Paletas de marca curadas (v3 parte 2 — ver spec-v3-2.md, Feature A.3).
 *
 * El organizador elige un preset; la DB guarda SÓLO la `theme_key` (migración
 * 0019). Cada preset re-tiñe ÚNICAMENTE la familia de acento (`--volt*` + los
 * tokens que derivan de ella: primary, ring, accent, sidebar, chart-1 y el halo
 * `.glow`). La estructura "Court Side" —off-white frío, superficies blancas,
 * plano por tono, tipografía expandida, números mono— queda FIJA. Es "cambiar de
 * equipo", no "romper el tablero" (DESIGN.md — Regla de Una Voz acotada al acento).
 *
 * `royal` reproduce EXACTAMENTE el azul real de hoy → cero regresión visual.
 * Sin violeta/magenta ni neón (PRODUCT.md — anti-template de IA).
 */
import type { CSSProperties } from 'react'

export type ThemeKey = 'royal' | 'pista' | 'clay' | 'match' | 'aqua' | 'grafito'

export const DEFAULT_THEME: ThemeKey = 'royal'

export type ThemePalette = {
  key: ThemeKey
  /** Nombre visible (es-AR, deportivo). */
  label: string
  /** Acento pleno → --volt / --primary / --ring / --chart-1. */
  volt: string
  /** Texto sobre el acento → --volt-foreground / --primary-foreground. */
  voltForeground: string
  /** Tono profundo (texto sobre tinte, hover) → --volt-deep / --accent-foreground. */
  voltDeep: string
  /** Relleno suave (chips, avatar, --accent). */
  voltTint: string
  /** Superficie destacada (fila líder de zona/llave). */
  voltSurface: string
  /** RGB del acento, formato "r, g, b" para el halo `.glow` (rgba()). */
  glowRgb: string
}

export const THEMES: Record<ThemeKey, ThemePalette> = {
  royal: {
    key: 'royal',
    label: 'Azul Real',
    volt: '#2d52e8',
    voltForeground: '#ffffff',
    voltDeep: '#1e3fae',
    voltTint: '#dbe3fb',
    voltSurface: '#f5f8ff',
    glowRgb: '45, 82, 232',
  },
  pista: {
    key: 'pista',
    label: 'Verde Pista',
    volt: '#0e9c77',
    voltForeground: '#ffffff',
    voltDeep: '#0e6e55',
    voltTint: '#d2f0e6',
    voltSurface: '#f1fbf7',
    glowRgb: '14, 156, 119',
  },
  clay: {
    key: 'clay',
    label: 'Naranja Clay',
    volt: '#e2620e',
    voltForeground: '#ffffff',
    voltDeep: '#a8470a',
    voltTint: '#fbe6d5',
    voltSurface: '#fff7f0',
    glowRgb: '226, 98, 14',
  },
  match: {
    key: 'match',
    label: 'Rojo Match',
    volt: '#dc2e3e',
    voltForeground: '#ffffff',
    voltDeep: '#a11a28',
    voltTint: '#fbdddf',
    voltSurface: '#fff5f5',
    glowRgb: '220, 46, 62',
  },
  aqua: {
    key: 'aqua',
    label: 'Cian Aqua',
    volt: '#0e8fa8',
    voltForeground: '#ffffff',
    voltDeep: '#0a6275',
    voltTint: '#d2eef4',
    voltSurface: '#f1fbfd',
    glowRgb: '14, 143, 168',
  },
  grafito: {
    key: 'grafito',
    // Acento gris medio (no negro): el grafito casi-negro original (#2b3242 /
    // #0d1020) se dibuja como TEXTO sobre el carbón #141416 de las imágenes de
    // difusión y sobre estados seleccionados oscuros → negro-sobre-negro. Este
    // acero medio mantiene contraste de texto blanco en botones (~5:1) y a la
    // vez se lee sobre el carbón oscuro (~3.6:1 en el tipo grande del afiche).
    label: 'Grafito',
    volt: '#646e80',
    voltForeground: '#ffffff',
    voltDeep: '#3a4252',
    voltTint: '#dde1ea',
    voltSurface: '#f4f5f8',
    glowRgb: '100, 110, 128',
  },
}

/** Lista ordenada para la grilla de swatches del picker. */
export const THEME_LIST: ThemePalette[] = Object.values(THEMES)

/** Acento de marca para las imágenes de difusión (OG/historia, Satori). */
export type OgAccent = { base: string; deep: string; tint: string; rgb: string }

/** Deriva el acento OG del preset (mismo color de marca que la app). */
export function themeAccent(key: string | null | undefined): OgAccent {
  const p = getTheme(key)
  return { base: p.volt, deep: p.voltDeep, tint: p.voltTint, rgb: p.glowRgb }
}

/** Resuelve una key (posiblemente null/inválida) al preset, con fallback al default. */
export function getTheme(key: string | null | undefined): ThemePalette {
  return THEMES[(key ?? '') as ThemeKey] ?? THEMES[DEFAULT_THEME]
}

/** Mapa var→valor del preset (set único compartido por `themeVars` y `themeCss`). */
function paletteVars(p: ThemePalette): Record<string, string> {
  return {
    '--volt': p.volt,
    '--volt-foreground': p.voltForeground,
    '--volt-deep': p.voltDeep,
    '--volt-tint': p.voltTint,
    '--volt-surface': p.voltSurface,
    '--primary': p.volt,
    '--primary-foreground': p.voltForeground,
    '--ring': p.volt,
    '--accent': p.voltTint,
    '--accent-foreground': p.voltDeep,
    '--chart-1': p.volt,
    '--sidebar-primary': p.volt,
    '--sidebar-primary-foreground': p.voltForeground,
    '--sidebar-accent': p.voltTint,
    '--sidebar-accent-foreground': p.voltDeep,
    '--sidebar-ring': p.volt,
    '--glow-rgb': p.glowRgb,
  }
}

/**
 * Estilo inline para re-teñir un subárbol (preview en vivo del picker en settings).
 * No alcanza al halo `.glow` del `<body>` (las custom props no heredan hacia arriba);
 * para teñir el documento entero —incluido el glow— usar `themeCss` en un `<style>`.
 */
export function themeVars(key: string | null | undefined): CSSProperties {
  return paletteVars(getTheme(key)) as CSSProperties
}

/**
 * Texto CSS `:root{…}` para teñir el documento completo desde un `<style>` inline
 * (renderizado dentro de la página, después de globals.css → gana la cascada).
 * Tiñe header, contenido y el halo `.glow` del body. Ver spec-v3-2.md A.4.
 */
export function themeCss(key: string | null | undefined): string {
  const decls = Object.entries(paletteVars(getTheme(key)))
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  return `:root{${decls}}`
}
