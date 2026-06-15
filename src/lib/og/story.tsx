/**
 * Builder compartido de la imagen de "historia" (Instagram) con next/og.
 *
 * Formato 1080×1920, branding Matchpoint (azul noche + acento volt). Lo consumen
 * los route handlers `/og/story` de torneo, campeón y calendario.
 *
 * Decisiones de diseño:
 * - **Sin QR**: la historia se ve desde el mismo celular que la comparte, así que
 *   un QR es inescaneable. En su lugar se imprime la URL legible como CTA y la
 *   persona agrega el *sticker de Enlace* de Instagram (la URL ya queda copiada
 *   al portapapeles desde el botón de compartir → es un solo pegar).
 * - **Safe zones**: Instagram tapa ~250px arriba y ~330px abajo con su propia UI.
 *   El contenido vive en la franja superior/central y el tercio inferior queda
 *   libre para que la persona ubique ahí el sticker de enlace.
 *
 * Corre en edge runtime (Satori). Estilos inline + flexbox: Satori no soporta
 * grid y exige `display:flex` en todo nodo con varios hijos. Sin emojis ni
 * glifos especiales: la fuente por defecto de Satori puede no tenerlos.
 */
import { ImageResponse } from 'next/og'

const VOLT = '#3b82f6'
const BG = '#0b1220'
const INK = '#ecf0f7'
const MUTED = '#9aa6bd'

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

export function buildStory({
  eyebrow,
  title,
  subtitle,
  url,
  caption,
}: StoryInput): ImageResponse {
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')

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
          backgroundImage: `radial-gradient(circle at 50% 22%, rgba(59,130,246,0.28), rgba(59,130,246,0) 55%)`,
          color: INK,
          // Safe zones: 290 arriba (UI de IG), 0 abajo (tercio libre para sticker).
          padding: '290px 96px 0',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 56, fontWeight: 700 }}>
          <span>Match</span>
          <span style={{ color: VOLT }}>point</span>
        </div>

        {/* Bloque central */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginTop: 120,
          }}
        >
          <span
            style={{
              fontSize: 38,
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
              fontSize: 116,
              fontWeight: 800,
              lineHeight: 1.05,
              marginTop: 28,
            }}
          >
            {title}
          </span>
          {subtitle ? (
            <span
              style={{
                fontSize: 46,
                color: MUTED,
                marginTop: 36,
                lineHeight: 1.3,
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
            marginTop: 90,
          }}
        >
          <span style={{ fontSize: 44, fontWeight: 700, color: INK }}>
            {caption}
          </span>
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              borderRadius: 24,
              border: `3px solid ${VOLT}`,
              backgroundColor: 'rgba(59,130,246,0.12)',
              padding: '22px 40px',
            }}
          >
            <span style={{ fontSize: 46, fontWeight: 700, color: VOLT }}>
              {displayUrl}
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  )
}
