/**
 * Builder compartido de la imagen de "historia" (Instagram) con next/og.
 *
 * Formato 1080×1920, branding Matchpoint (azul noche + acento volt) y un QR al
 * link público (reusa qrcode.react). Lo consumen los route handlers
 * `/og/story` de torneo, campeón y calendario.
 *
 * Corre en edge runtime (Satori). Estilos inline + flexbox: Satori no soporta
 * grid y exige `display:flex` en todo nodo con varios hijos.
 *
 * El QR NO puede ser un componente React con hooks (qrcode.react usa useMemo y
 * Satori no ejecuta hooks): se genera como SVG estático con `qrcode` y se
 * embebe como <img> con data URI.
 */
import { ImageResponse } from 'next/og'
import QRCode from 'qrcode'

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
  /** URL que codifica el QR. */
  qrValue: string
  /** Texto debajo del QR. */
  caption: string
}

export async function buildStory({
  eyebrow,
  title,
  subtitle,
  qrValue,
  caption,
}: StoryInput): Promise<ImageResponse> {
  // QR como SVG estático (sin hooks): módulos navy sobre fondo blanco para que
  // escanee bien. Se embebe como data URI en un <img>.
  const qrSvg = await QRCode.toString(qrValue, {
    type: 'svg',
    margin: 0,
    color: { dark: '#0b1220', light: '#ffffff' },
  })
  const qrDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '1080px',
          height: '1920px',
          backgroundColor: BG,
          backgroundImage: `radial-gradient(circle at 50% 18%, rgba(59,130,246,0.28), rgba(59,130,246,0) 55%)`,
          color: INK,
          padding: '110px 96px',
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

        {/* QR */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: '#ffffff',
              borderRadius: 28,
              padding: 28,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUri} width={240} height={240} alt="" />
          </div>
          <span
            style={{
              fontSize: 40,
              color: INK,
              marginLeft: 44,
              maxWidth: 460,
              lineHeight: 1.25,
              fontWeight: 600,
            }}
          >
            {caption}
          </span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  )
}
