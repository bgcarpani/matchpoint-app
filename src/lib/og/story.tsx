/**
 * Builder compartido de la imagen de "historia" (Instagram) con next/og.
 *
 * Formato 1080×1920, fondo noche + acento de marca del organizador (v3.2: la
 * paleta elegida tiñe también las imágenes de difusión). Lo consumen los route
 * handlers `/og/story` de torneo y calendario.
 *
 * Consistencia con la app:
 * - **Tipografía Archivo** (la misma que la app vía `next/font`). Satori no ve las
 *   fuentes del navegador, así que los .ttf (400/700/800) van **embebidos en
 *   base64** (`fonts.generated.ts`, generado desde `./fonts/*.ttf`) y se los
 *   pasamos a `ImageResponse`. Se embeben (en vez de `fetch(import.meta.url)`)
 *   porque en Cloudflare Workers no se puede `fetch` un asset bundleado.
 * - **Acento** = la paleta de marca del organizador (`themeAccent`); el resto de
 *   los neutros del tema noche quedan fijos.
 * - **Logo**: si el organizador subió uno (raster), reemplaza al wordmark.
 *
 * Decisiones de diseño:
 * - **Sin QR**: la historia se ve desde el mismo celular que la comparte. En su
 *   lugar se imprime la URL legible como CTA y la persona agrega el *sticker de
 *   Enlace* de Instagram (la URL ya queda copiada al portapapeles).
 * - **Safe zones**: Instagram tapa ~280px arriba y ~330px abajo; el contenido
 *   vive en la franja superior/central y el tercio inferior queda libre.
 *
 * Corre en el runtime de Cloudflare Workers (Satori). Estilos inline + flexbox.
 * Sin emojis ni glifos especiales: la fuente puede no tenerlos.
 */
import { ImageResponse } from 'next/og'
import { ARCHIVO_FONTS } from './fonts.generated'
import type { OgAccent } from '@/lib/branding/themes'

/**
 * Paleta "noche" fija de las imágenes OG (Satori no puede usar CSS vars del tema).
 * Neutros **sin tinte** (canales RGB parejos) para que convivan con cualquier
 * acento de marca del organizador: un fondo azulado chocaba con paletas no-azules.
 */
export const BG = '#141416'
export const INK = '#f0f1f2'
export const MUTED = '#9a9ba1'
export const LINE = '#26272c'

type FontWeight = 400 | 700 | 800

export type LoadedFont = {
  name: string
  data: ArrayBuffer
  weight: FontWeight
  style: 'normal'
}

let fontsCache: LoadedFont[] | null = null

/** Decodifica base64 → ArrayBuffer sin depender de Buffer (portable a edge/workerd). */
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** ArrayBuffer → base64 (para embeber el logo como data URL). */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

/**
 * Carga el logo del organizador como data URL para incrustarlo en la imagen OG.
 * Defensivo: cualquier fallo (fetch, tipo no soportado) devuelve null y la pieza
 * cae al wordmark. **Sólo raster** (PNG/JPG/WEBP): Satori no rinde SVG en `<img>`.
 */
export async function loadLogoDataUrl(
  url: string | null | undefined
): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!/^image\/(png|jpe?g|webp)$/i.test(ct)) return null
    return `data:${ct};base64,${arrayBufferToBase64(await res.arrayBuffer())}`
  } catch {
    return null
  }
}

/**
 * Devuelve (y cachea por módulo) los .ttf de Archivo embebidos como base64
 * (ver `fonts.generated.ts`). No usa `fetch`/fs: en Cloudflare Workers no se
 * puede `fetch` un asset bundleado vía `import.meta.url`.
 */
export function loadFonts(): LoadedFont[] {
  if (fontsCache) return fontsCache
  fontsCache = ARCHIVO_FONTS.map(({ weight, data }) => ({
    name: 'Archivo',
    data: base64ToArrayBuffer(data),
    weight,
    style: 'normal' as const,
  }))
  return fontsCache
}

/** Wordmark "Matchpoint" o, si hay logo, el logo del club. */
function Brand({
  logoDataUrl,
  accent,
}: {
  logoDataUrl: string | null | undefined
  accent: string
}) {
  if (logoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Satori (OG image)
      <img
        src={logoDataUrl}
        alt=""
        width={150}
        height={150}
        style={{ objectFit: 'contain', borderRadius: 28 }}
      />
    )
  }
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 50,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: -1,
      }}
    >
      <span>Match</span>
      <span style={{ color: accent }}>point</span>
    </div>
  )
}

/**
 * Lockup de marca del organizador para las piezas de difusión: logo (raster) +
 * nombre del club al lado. Si no hay logo, el nombre solo actúa de wordmark.
 * Compartido por torneo y campeón (el calendario muestra el nombre como título).
 */
export function BrandLockup({
  logoDataUrl,
  name,
  ink,
  center = false,
  logoSize = 150,
  nameSize = 42,
}: {
  logoDataUrl: string | null | undefined
  name: string
  ink: string
  center?: boolean
  logoSize?: number
  nameSize?: number
}) {
  const nameNode = (
    <span
      style={{
        display: 'flex',
        fontSize: logoDataUrl ? nameSize : nameSize + 14,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: -1,
        lineHeight: 1.05,
        color: ink,
        maxWidth: logoDataUrl ? 600 : 880,
      }}
    >
      {name}
    </span>
  )

  if (!logoDataUrl) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: center ? 'center' : 'flex-start',
        }}
      >
        {nameNode}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori (OG image) */}
      <img
        src={logoDataUrl}
        alt=""
        width={logoSize}
        height={logoSize}
        style={{ objectFit: 'contain', borderRadius: 28, marginRight: 28 }}
      />
      {nameNode}
    </div>
  )
}

export interface StoryInput {
  /** Etiqueta superior, ej. "Torneo" / "Calendario". */
  eyebrow: string
  /** Título principal grande. */
  title: string
  /** Línea(s) de apoyo bajo el título. */
  subtitle?: string
  /** URL pública de destino; se muestra como CTA legible (sin protocolo). */
  url: string
  /** Llamado a la acción bajo la URL, ej. "Inscribite online". */
  caption: string
  /** Acento de marca del organizador. */
  accent: OgAccent
  /** Logo del club (data URL) o null → wordmark. */
  logoDataUrl?: string | null
}

export async function buildStory({
  eyebrow,
  title,
  subtitle,
  url,
  caption,
  accent,
  logoDataUrl,
}: StoryInput): Promise<ImageResponse> {
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const fonts = loadFonts()

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          width: '1080px',
          height: '1920px',
          backgroundColor: BG,
          color: INK,
          // Safe zones: 280 arriba (UI de IG), 0 abajo (tercio libre para sticker).
          padding: '280px 96px 0',
          fontFamily: 'Archivo',
        }}
      >
        <Brand logoDataUrl={logoDataUrl} accent={accent.base} />

        {/* Bloque central */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginTop: 116,
          }}
        >
          <span
            style={{
              fontSize: 34,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: accent.base,
              fontWeight: 700,
            }}
          >
            {eyebrow}
          </span>
          <span
            style={{
              fontSize: 100,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: -2,
              lineHeight: 1,
              marginTop: 26,
            }}
          >
            {title}
          </span>
          {subtitle ? (
            <span
              style={{
                fontSize: 42,
                fontWeight: 400,
                color: MUTED,
                marginTop: 34,
                lineHeight: 1.4,
                whiteSpace: 'pre-line',
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </div>

        {/* CTA + URL legible (reemplaza al QR) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            marginTop: 80,
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 700, color: INK }}>
            {caption}
          </span>
          <div
            style={{
              display: 'flex',
              width: '100%',
              marginTop: 26,
              borderRadius: 24,
              border: `3px solid ${accent.base}`,
              backgroundColor: `rgba(${accent.rgb},0.12)`,
              padding: '24px 36px',
            }}
          >
            <span
              style={{
                fontSize: 38,
                fontWeight: 700,
                color: accent.base,
                lineHeight: 1.3,
                wordBreak: 'break-all',
              }}
            >
              {displayUrl}
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts }
  )
}
