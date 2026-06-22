/**
 * Builder de la imagen de "historia" (Instagram) de la PAREJA CAMPEONA — 1080×1920.
 *
 * A diferencia del builder genérico (`story.tsx`), este es específico del campeón
 * y soporta 3 estilos que el organizer elige al compartir (`?style=a|b|c`):
 *   - 'a' Marquesina: fondo noche, alineado a la izquierda, banda de categoría sólida.
 *   - 'b' Sello: azul degradé, centrado tipo medalla, categoría en píldora con borde.
 *   - 'c' Editorial: claro (off-white), categoría como titular arriba.
 *
 * Reglas heredadas de `story.tsx` (ver ese archivo para el detalle):
 * - Tipografía **Archivo** embebida en base64 (pesos 400/700/800; NO hay 900 ni
 *   JetBrains Mono en el bundle de OG, así que todo va en Archivo).
 * - Sin URL "quemada": el tercio inferior queda libre para el sticker de Enlace
 *   de Instagram. Sin animación (es un PNG), sin emojis ni glifos especiales.
 * - Satori: estilos inline + flexbox (todo nodo con varios hijos lleva `display:flex`).
 *   Corre en el runtime de Cloudflare Workers.
 *
 * Paleta = tokens "Court Side" de `DESIGN.md` (azul real #2D52E8, profundo #1E3FAE,
 * ink #0D1020, off-white #F4F5F8) + dorado de copa para la celebración.
 */
import { ImageResponse } from 'next/og'
import { loadFonts } from './story'

export type ChampionStyle = 'a' | 'b' | 'c'

export interface ChampionStoryInput {
  style: ChampionStyle
  /** Nombre completo del jugador 1 del campeón. */
  name1: string
  /** Nombre completo del jugador 2 del campeón. */
  name2: string
  /** Nombre del torneo. */
  tournamentName: string
  /** "6ta · Caballeros" — categoría + género, ya combinados. */
  category: string
  /** CTA bajo el bloque principal, ej. "Mirá las llaves". */
  caption: string
}

const GOLD_A = '#FFD75E'
const GOLD_B = '#F0A41E'
const GOLD_INK = '#7a4a00'

/** Copa dibujada con primitivas SVG (Satori no tiene la webfont de íconos). */
function Trophy({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{ display: 'flex' }}
    >
      <path d="M7 7 L25 7 L22 18 L10 18 Z" fill={color} />
      <path d="M14.5 18 H17.5 V23 H14.5 Z" fill={color} />
      <path d="M9 23 H23 V26 H9 Z" fill={color} />
      <path d="M7 8 C2 8 2 16 10 16" stroke={color} strokeWidth="2" fill="none" />
      <path
        d="M25 8 C30 8 30 16 22 16"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}

/** Disco dorado con la copa, el "sello" de campeón. */
function TrophyBadge({ size, glow }: { size: number; glow: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: GOLD_B,
        backgroundImage: `linear-gradient(135deg, ${GOLD_A}, ${GOLD_B})`,
        boxShadow: `0 0 ${size * 0.6}px ${glow}`,
      }}
    >
      <Trophy size={size * 0.56} color={GOLD_INK} />
    </div>
  )
}

/** Bloque de los dos nombres apilados con el "&" de acento. */
function Names({
  name1,
  name2,
  ink,
  accent,
  size,
  center,
}: {
  name1: string
  name2: string
  ink: string
  accent: string
  size: number
  center?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: center ? 'center' : 'flex-start',
        fontSize: size,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: -2,
        lineHeight: 1.04,
        color: ink,
      }}
    >
      <span style={{ display: 'flex' }}>{name1}</span>
      <span style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ color: accent, marginRight: 16 }}>&</span>
        <span style={{ display: 'flex' }}>{name2}</span>
      </span>
    </div>
  )
}

function Wordmark({ ink, accent, size = 52 }: { ink: string; accent: string; size?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: size,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: -1,
        color: ink,
      }}
    >
      <span>Match</span>
      <span style={{ color: accent }}>point</span>
    </div>
  )
}

const EYEBROW = 'Pareja campeona'

export async function buildChampionStory({
  style,
  name1,
  name2,
  tournamentName,
  category,
  caption,
}: ChampionStoryInput): Promise<ImageResponse> {
  const fonts = loadFonts()
  const cat = category.toUpperCase()

  let content: React.ReactNode

  if (style === 'b') {
    // Sello centrado sobre azul degradé.
    content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '1080px',
          height: '1920px',
          backgroundColor: '#1E3FAE',
          backgroundImage: 'linear-gradient(160deg, #2D52E8, #1E3FAE)',
          color: '#ffffff',
          textAlign: 'center',
          padding: '210px 96px 0',
          fontFamily: 'Archivo',
        }}
      >
        <Wordmark ink="#ffffff" accent="#DBE3FB" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 96,
          }}
        >
          <TrophyBadge size={180} glow="rgba(255,215,94,0.5)" />
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: '#DBE3FB',
              marginTop: 40,
            }}
          >
            {EYEBROW}
          </span>
          <div style={{ display: 'flex', marginTop: 28 }}>
            <Names
              name1={name1}
              name2={name2}
              ink="#ffffff"
              accent={GOLD_A}
              size={82}
              center
            />
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 36,
              border: '3px solid rgba(255,255,255,0.55)',
              borderRadius: 999,
              padding: '14px 40px',
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#ffffff',
            }}
          >
            {cat}
          </div>
          <span
            style={{
              fontSize: 38,
              fontWeight: 400,
              color: '#DBE3FB',
              marginTop: 30,
            }}
          >
            {tournamentName}
          </span>
          <span
            style={{
              fontSize: 34,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 4,
              color: '#ffffff',
              marginTop: 64,
            }}
          >
            {caption}
          </span>
        </div>
      </div>
    )
  } else if (style === 'c') {
    // Editorial claro: la categoría es el titular de arriba.
    content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          width: '1080px',
          height: '1920px',
          backgroundColor: '#F4F5F8',
          backgroundImage:
            'radial-gradient(circle at 80% 28%, rgba(45,82,232,0.18), rgba(45,82,232,0) 60%)',
          color: '#0D1020',
          padding: '210px 96px 0',
          fontFamily: 'Archivo',
        }}
      >
        <Wordmark ink="#0D1020" accent="#2D52E8" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginTop: 104,
          }}
        >
          <span
            style={{
              fontSize: 60,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#2D52E8',
            }}
          >
            {cat}
          </span>
          <span
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#69728A',
              marginTop: 28,
            }}
          >
            {EYEBROW}
          </span>
          <div style={{ display: 'flex', marginTop: 24 }}>
            <Names
              name1={name1}
              name2={name2}
              ink="#0D1020"
              accent="#2D52E8"
              size={86}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: 40,
            }}
          >
            <TrophyBadge size={92} glow="rgba(255,215,94,0.45)" />
            <span
              style={{
                fontSize: 38,
                fontWeight: 400,
                color: '#69728A',
                marginLeft: 28,
              }}
            >
              {tournamentName}
            </span>
          </div>
          <span
            style={{
              fontSize: 34,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 4,
              color: '#2D52E8',
              marginTop: 72,
            }}
          >
            {caption}
          </span>
        </div>
      </div>
    )
  } else {
    // 'a' Marquesina: fondo noche, izquierda, banda de categoría sólida.
    content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          width: '1080px',
          height: '1920px',
          backgroundColor: '#0D1020',
          backgroundImage:
            'radial-gradient(circle at 22% 40%, rgba(45,82,232,0.5), rgba(45,82,232,0) 55%)',
          color: '#ffffff',
          padding: '210px 96px 0',
          fontFamily: 'Archivo',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Wordmark ink="#ffffff" accent="#2D52E8" />
          <TrophyBadge size={84} glow="rgba(255,215,94,0.5)" />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginTop: 96,
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#2D52E8',
            }}
          >
            {EYEBROW}
          </span>
          <div style={{ display: 'flex', marginTop: 28 }}>
            <Names
              name1={name1}
              name2={name2}
              ink="#ffffff"
              accent="#2D52E8"
              size={86}
            />
          </div>
          <span
            style={{
              fontSize: 38,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.62)',
              marginTop: 28,
            }}
          >
            {tournamentName}
          </span>
          <div
            style={{
              display: 'flex',
              marginTop: 40,
              backgroundColor: '#2D52E8',
              borderRadius: 16,
              padding: '18px 32px',
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#ffffff',
            }}
          >
            {cat}
          </div>
          <span
            style={{
              fontSize: 34,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 4,
              color: '#DBE3FB',
              marginTop: 72,
            }}
          >
            {caption}
          </span>
        </div>
      </div>
    )
  }

  return new ImageResponse(content, { width: 1080, height: 1920, fonts })
}
