/**
 * Builder compartido de la imagen de "historia" (Instagram) con next/og.
 *
 * Formato 1080×1920, branding Matchpoint (azul noche + acento volt). Lo consumen
 * los route handlers `/og/story` de torneo, campeón y calendario.
 *
 * Consistencia con la app:
 * - **Tipografía Archivo** (la misma que la app vía `next/font`). Satori no ve las
 *   fuentes del navegador, así que los .ttf (400/700/800) van **embebidos en
 *   base64** (`fonts.generated.ts`, generado desde `./fonts/*.ttf`) y se los
 *   pasamos a `ImageResponse`. Se embeben (en vez de `fetch(import.meta.url)`)
 *   porque en Cloudflare Workers no se puede `fetch` un asset bundleado. Los
 *   títulos y el wordmark replican la clase `.font-display` (Archivo 800
 *   uppercase, tracking tight) de `globals.css`.
 * - **Tokens de color** = los de `globals.css` (`--background`, `--foreground`,
 *   `--volt`, `--muted-foreground`).
 *
 * Decisiones de diseño:
 * - **Sin QR**: la historia se ve desde el mismo celular que la comparte, así que
 *   un QR es inescaneable. En su lugar se imprime la URL legible como CTA y la
 *   persona agrega el *sticker de Enlace* de Instagram (la URL ya queda copiada
 *   al portapapeles desde el botón de compartir → es un solo pegar).
 * - **Safe zones**: Instagram tapa ~280px arriba y ~330px abajo con su propia UI.
 *   El contenido vive en la franja superior/central y el tercio inferior queda
 *   libre para que la persona ubique ahí el sticker de enlace.
 *
 * Corre en el runtime de Cloudflare Workers (Satori). Estilos inline + flexbox:
 * Satori no soporta grid y exige `display:flex` en todo nodo con varios hijos.
 * Sin emojis ni glifos especiales: la fuente puede no tenerlos.
 */
import { ImageResponse } from 'next/og'
import { ARCHIVO_FONTS } from './fonts.generated'

const VOLT = '#3b82f6'
const BG = '#0b1220'
const INK = '#ecf0f7'
const MUTED = '#9aa6bd'

type FontWeight = 400 | 700 | 800

type LoadedFont = {
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

/**
 * Devuelve (y cachea por módulo) los .ttf de Archivo embebidos como base64
 * (ver `fonts.generated.ts`). No usa `fetch`/fs: en Cloudflare Workers no se
 * puede `fetch` un asset bundleado vía `import.meta.url`.
 */
function loadFonts(): LoadedFont[] {
  if (fontsCache) return fontsCache
  fontsCache = ARCHIVO_FONTS.map(({ weight, data }) => ({
    name: 'Archivo',
    data: base64ToArrayBuffer(data),
    weight,
    style: 'normal' as const,
  }))
  return fontsCache
}

export interface StoryInput {
  /** Etiqueta superior, ej. "Torneo" / "Campeón" / "Calendario". */
  eyebrow: string
  /** Título principal grande. */
  title: string
  /** Línea(s) de apoyo bajo el título. */
  subtitle?: string
  /** URL pública de destino; se muestra como CTA legible (sin protocolo). */
  url: string
  /** Llamado a la acción bajo la URL, ej. "Inscribite online". */
  caption: string
}

export async function buildStory({
  eyebrow,
  title,
  subtitle,
  url,
  caption,
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
          backgroundImage: `radial-gradient(circle at 50% 18%, rgba(59,130,246,0.26), rgba(59,130,246,0) 55%)`,
          color: INK,
          // Safe zones: 280 arriba (UI de IG), 0 abajo (tercio libre para sticker).
          padding: '280px 96px 0',
          fontFamily: 'Archivo',
        }}
      >
        {/* Wordmark — replica `.font-display`: Archivo 800 uppercase, tracking tight */}
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
          <span style={{ color: VOLT }}>point</span>
        </div>

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
              color: VOLT,
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
              border: `3px solid ${VOLT}`,
              backgroundColor: 'rgba(59,130,246,0.12)',
              padding: '24px 36px',
            }}
          >
            <span
              style={{
                fontSize: 38,
                fontWeight: 700,
                color: VOLT,
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
