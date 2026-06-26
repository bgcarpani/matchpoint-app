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

/**
 * Wordmark "Matchpoint" o, si hay logo, el logo del club. Lo usan las piezas en
 * las que el nombre del club es el TÍTULO héroe (calendario): el logo identifica
 * arriba y el nombre no se duplica (a diferencia de `BrandLockup`, que imprime
 * logo + nombre juntos para torneo/campeón, donde el héroe es otro dato).
 */
export function Brand({
  logoDataUrl,
  accent,
  center = false,
}: {
  logoDataUrl: string | null | undefined
  accent: string
  /** Centra el logo/wordmark horizontalmente (masthead de las piezas de difusión). */
  center?: boolean
}) {
  const mark = logoDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- Satori (OG image)
    <img
      src={logoDataUrl}
      alt=""
      width={150}
      height={150}
      style={{ objectFit: 'contain', borderRadius: 28 }}
    />
  ) : (
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
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: center ? 'center' : 'flex-start',
      }}
    >
      {mark}
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

