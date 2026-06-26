/**
 * Builder de la imagen de "historia" (Instagram) de DIFUSIÓN DE TORNEO — 1080×1920.
 *
 * Espejo del builder del campeón (`champion-story.tsx`): 3 estilos que el organizer
 * elige al compartir (`?style=a|b|c`), todos teñidos por la **paleta de marca del
 * organizador** (`themeAccent` → `accent`), igual que el campeón y las páginas
 * públicas. La idea de afiche viene de los flyers que la comunidad ya comparte:
 * lidera con la **categoría** (dato héroe), no con el nombre del torneo.
 *
 *   - 'a' Afiche:   fondo noche + glow, categoría como héroe apilada (formato/Del Carmen).
 *   - 'b' Marcador: tablero Court Side, la categoría como marcador (número mono grande).
 *   - 'c' Ficha:    claro/editorial, categoría como titular + datos en lista.
 *
 * Reglas heredadas de `story.tsx` (Satori / Cloudflare Workers): tipografía Archivo
 * embebida (400/700/800), estilos inline + flexbox (sin grid; todo nodo con varios
 * hijos lleva display:flex), sin emojis ni glifos raros, sin `runtime='edge'`.
 * **Safe zones** de Instagram: ~280px arriba y ~330px abajo los tapa la UI; el
 * contenido vive en la franja superior/central y el tercio inferior queda libre
 * para el sticker de Enlace, por eso la URL va como CTA legible (sin QR).
 */
import { ImageResponse } from 'next/og'
import { loadFonts, BrandLockup, BG, INK, MUTED, LINE } from './story'
import type { OgAccent } from '@/lib/branding/themes'
import type { CategoryType } from '@/lib/types/database'

export type TournamentStyle = 'a' | 'b' | 'c'

export interface TournamentStoryInput {
  style: TournamentStyle
  /** Nombre del club/organización (lockup de marca). */
  establishmentName: string
  /** Tipo de categoría (define el render del héroe). */
  categoryType: CategoryType
  /** Valor de la categoría: "11" (suma) / "6ta" (individual). */
  categoryValue: string
  /** Género ya etiquetado, ej. "Masculino". */
  gender: string
  /** Fecha lista para imprimir, ej. "Sábado 27 de junio". */
  dateLabel: string
  /** Formato del torneo (constante de plataforma), ej. "Americano". */
  formatLabel: string
  /** Parejas aceptadas (cupos confirmados). */
  acceptedPairs: number
  /** Cupo máximo de parejas. */
  maxPairs: number
  /** URL pública de destino; se muestra como CTA legible (sin protocolo). */
  url: string
  /** Acento de marca del organizador. */
  accent: OgAccent
  /** Logo del club (data URL) o null → wordmark. */
  logoDataUrl?: string | null
}

const EYEBROW = 'Torneo'

/** Partes del héroe de categoría según el tipo. */
function categoryHero(type: CategoryType, value: string): {
  top: string | null
  main: string
} {
  return type === 'suma'
    ? { top: 'SUMA', main: value }
    : { top: null, main: value.toUpperCase() }
}

/** Texto de cupos restantes (singular/plural/completo). */
function spotsLabel(accepted: number, max: number): string {
  const left = Math.max(0, max - accepted)
  if (left <= 0) return 'CUPO COMPLETO'
  return left === 1 ? 'QUEDA 1 LUGAR' : `QUEDAN ${left} LUGARES`
}

export async function buildTournamentStory({
  style,
  establishmentName,
  categoryType,
  categoryValue,
  gender,
  dateLabel,
  formatLabel,
  acceptedPairs,
  maxPairs,
  url,
  accent,
  logoDataUrl,
}: TournamentStoryInput): Promise<ImageResponse> {
  const fonts = loadFonts()
  const hero = categoryHero(categoryType, categoryValue)
  const genderUpper = gender.toUpperCase()
  const formatUpper = formatLabel.toUpperCase()
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const capacity = `${acceptedPairs} / ${maxPairs}`

  let content: React.ReactNode

  if (style === 'b') {
    // Marcador: tablero noche, banda de acento, categoría como marcador mono.
    const big = categoryType === 'suma' ? categoryValue : categoryValue.toUpperCase()
    const subline =
      categoryType === 'suma' ? `SUMA · ${genderUpper}` : genderUpper
    content = (
      <div
        style={{
          display: 'flex',
          width: '1080px',
          height: '1920px',
          backgroundColor: BG,
          color: '#ffffff',
          fontFamily: 'Archivo',
        }}
      >
        <div style={{ display: 'flex', width: 26, backgroundColor: accent.base }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '280px 80px 230px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <BrandLockup
              logoDataUrl={logoDataUrl}
              name={establishmentName}
              ink="#ffffff"
              logoSize={120}
              nameSize={34}
              center
            />
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: MUTED,
                marginTop: 14,
              }}
            >
              {dateLabel}
            </span>
          </div>

          <div style={{ display: 'flex', flexGrow: 1 }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                fontSize: 32,
                letterSpacing: 10,
                textTransform: 'uppercase',
                color: accent.base,
                fontWeight: 700,
              }}
            >
              Categoría
            </span>
            <span
              style={{
                fontSize: 360,
                fontWeight: 800,
                letterSpacing: -16,
                lineHeight: 0.8,
                marginTop: 8,
              }}
            >
              {big}
            </span>
            <span
              style={{
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginTop: 24,
              }}
            >
              {subline}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `2px solid ${LINE}`,
                paddingTop: 28,
                fontSize: 36,
              }}
            >
              <span style={{ color: MUTED, fontWeight: 700 }}>FORMATO</span>
              <span style={{ fontWeight: 800 }}>{formatUpper}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 22,
                fontSize: 36,
              }}
            >
              <span style={{ color: MUTED, fontWeight: 700 }}>CUPOS</span>
              <span style={{ fontWeight: 800, color: accent.base }}>{capacity}</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 30,
                backgroundColor: accent.base,
                borderRadius: 20,
                padding: '28px',
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#ffffff',
              }}
            >
              Inscribite online
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: MUTED,
                marginTop: 20,
                wordBreak: 'break-all',
              }}
            >
              {displayUrl}
            </span>
          </div>
        </div>
      </div>
    )
  } else if (style === 'c') {
    // Ficha editorial clara: categoría como titular + datos en lista.
    content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1080px',
          height: '1920px',
          backgroundColor: '#f4f5f8',
          color: '#0d1020',
          padding: '280px 96px 230px',
          fontFamily: 'Archivo',
        }}
      >
        <BrandLockup
          logoDataUrl={logoDataUrl}
          name={establishmentName}
          ink="#0d1020"
          center
        />

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 120 }}>
          <span
            style={{
              fontSize: 34,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: '#69728a',
              fontWeight: 700,
            }}
          >
            {EYEBROW}
          </span>
          <span
            style={{
              fontSize: 150,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 0.9,
              color: accent.base,
              marginTop: 18,
            }}
          >
            {hero.top ? `${hero.top} ${hero.main}` : hero.main}
          </span>
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginTop: 16,
            }}
          >
            {genderUpper}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 64 }}>
          {[
            ['Fecha', dateLabel],
            ['Formato', formatLabel],
            ['Cupos', `${capacity} parejas`],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #dcdfe7',
                padding: '26px 0',
                fontSize: 40,
              }}
            >
              <span style={{ color: '#69728a', fontWeight: 700 }}>{k}</span>
              <span style={{ fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: accent.base }}>
            Inscribite online
          </span>
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              backgroundColor: accent.base,
              borderRadius: 24,
              padding: '28px 36px',
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: '#ffffff',
                wordBreak: 'break-all',
              }}
            >
              {displayUrl}
            </span>
          </div>
        </div>
      </div>
    )
  } else {
    // 'a' Afiche: noche + glow, categoría como héroe apilada.
    content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1080px',
          height: '1920px',
          backgroundColor: BG,
          color: INK,
          padding: '280px 96px 230px',
          fontFamily: 'Archivo',
        }}
      >
        <BrandLockup
          logoDataUrl={logoDataUrl}
          name={establishmentName}
          ink={INK}
          center
        />

        <span
          style={{
            fontSize: 34,
            letterSpacing: 9,
            textTransform: 'uppercase',
            color: accent.base,
            fontWeight: 700,
            marginTop: 64,
          }}
        >
          {`${EYEBROW} · ${formatUpper}`}
        </span>
        <span
          style={{
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginTop: 14,
          }}
        >
          {dateLabel}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44 }}>
          {hero.top ? (
            <span
              style={{
                fontSize: 130,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 0.9,
              }}
            >
              {hero.top}
            </span>
          ) : null}
          <span
            style={{
              fontSize: hero.top ? 300 : 220,
              fontWeight: 800,
              letterSpacing: -12,
              lineHeight: 0.8,
            }}
          >
            {hero.main}
          </span>
        </div>
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: MUTED,
            marginTop: 30,
          }}
        >
          {genderUpper}
        </span>

        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              borderRadius: 999,
              border: `3px solid ${accent.base}`,
              backgroundColor: `rgba(${accent.rgb},0.16)`,
              padding: '16px 36px',
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: accent.tint,
            }}
          >
            {spotsLabel(acceptedPairs, maxPairs)}
          </div>
          <span
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: MUTED,
              marginTop: 32,
              letterSpacing: 1,
            }}
          >
            INSCRIBITE ONLINE
          </span>
          <div
            style={{
              display: 'flex',
              marginTop: 18,
              borderRadius: 24,
              border: `3px solid ${accent.base}`,
              backgroundColor: `rgba(${accent.rgb},0.12)`,
              padding: '26px 36px',
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: accent.tint,
                wordBreak: 'break-all',
              }}
            >
              {displayUrl}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return new ImageResponse(content, { width: 1080, height: 1920, fonts })
}
