/**
 * Builder de la imagen de "historia" (Instagram) del CALENDARIO del organizador —
 * 1080×1920. Espejo del builder de torneo (`tournament-story.tsx`): 3 estilos que
 * el organizer elige al compartir (`?style=a|b|c`), todos teñidos por la **paleta
 * de marca del organizador** (`themeAccent` → `accent`).
 *
 *   - 'a' Afiche:   noche, el NOMBRE del club como héroe + pill de cupos de torneos.
 *   - 'b' Marcador: tablero noche, la CANTIDAD de torneos vigentes como marcador mono.
 *   - 'c' Ficha:    claro/editorial, club como titular en acento + cantidad.
 *
 * A diferencia del torneo, acá el "dato héroe" es el club / la cantidad de torneos
 * (el calendario no tiene categoría). Por eso en 'a' y 'c' el nombre es el título
 * y arriba va sólo el logo (o el wordmark) vía `Brand` —no se duplica el nombre—;
 * en 'b', donde el héroe es el número, el club va en el lockup (logo + nombre).
 *
 * Reglas heredadas de `story.tsx` (Satori / Cloudflare Workers): tipografía Archivo
 * embebida (400/700/800), estilos inline + flexbox, sin emojis, sin `runtime='edge'`,
 * neutros "noche" sin tinte (BG/INK/MUTED/LINE). **Safe zones** de Instagram: ~280px
 * arriba y ~330px abajo los tapa la UI; el contenido vive arriba/centro y la URL va
 * como CTA legible (sin QR).
 */
import { ImageResponse } from 'next/og'
import { loadFonts, Brand, BrandLockup, BG, INK, MUTED } from './story'
import type { OgAccent } from '@/lib/branding/themes'

export type CalendarStyle = 'a' | 'b' | 'c' | 'd'

/** Datos del mes para el estilo 'd' (mini calendario). */
export interface CalendarMonth {
  /** Año (ej. 2026). */
  year: number
  /** Mes 1-12. */
  month: number
  /** Etiqueta lista para imprimir, ej. "Julio 2026". */
  label: string
  /** Días del mes que tienen al menos un torneo (1-31). */
  days: number[]
  /** Cantidad de torneos del mes (puede haber varios en un día). */
  count: number
}

export interface CalendarStoryInput {
  style: CalendarStyle
  /** Nombre del club/organización. */
  establishmentName: string
  /** Cantidad de torneos vigentes (define el dato héroe del 'Marcador'). */
  tournamentCount: number
  /** URL pública del calendario; se muestra como CTA legible (sin protocolo). */
  url: string
  /** Acento de marca del organizador. */
  accent: OgAccent
  /** Logo del club (data URL) o null → wordmark. */
  logoDataUrl?: string | null
  /** Datos del mes (requerido sólo por el estilo 'd' / mini calendario). */
  month?: CalendarMonth
}

const EYEBROW = 'Calendario de torneos'
const CTA = 'Mirá la agenda'

/** Línea de cantidad, ej. "3 torneos vigentes" / "Próximamente". */
function countLine(count: number): string {
  if (count <= 0) return 'Próximamente, nuevos torneos'
  return `${count} ${count === 1 ? 'torneo vigente' : 'torneos vigentes'}`
}

/** Tamaño del título-héroe (nombre del club) según su largo, para que no desborde. */
function nameSize(name: string): number {
  const n = name.length
  if (n <= 10) return 132
  if (n <= 16) return 104
  if (n <= 24) return 80
  return 64
}

/** Etiquetas de los días de la semana (es-AR, empieza en lunes; X = miércoles). */
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Arma la grilla del mes como matriz de semanas (cada una con 7 celdas; `null` =
 * día fuera del mes). Lunes primero. Usa UTC para que el día no se corra por zona.
 */
function monthGrid(year: number, month: number): (number | null)[][] {
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export async function buildCalendarStory({
  style,
  establishmentName,
  tournamentCount,
  url,
  accent,
  logoDataUrl,
  month,
}: CalendarStoryInput): Promise<ImageResponse> {
  const fonts = loadFonts()
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const hasTournaments = tournamentCount > 0
  const countUpper = hasTournaments
    ? `${tournamentCount} ${tournamentCount === 1 ? 'TORNEO VIGENTE' : 'TORNEOS VIGENTES'}`
    : 'PRÓXIMAMENTE'

  let content: React.ReactNode

  if (style === 'd' && month) {
    // Mes: mini calendario con los días que tienen torneo resaltados.
    const weeks = monthGrid(month.year, month.month)
    const dayset = new Set(month.days)
    const CELL = 118
    const summary =
      month.count > 0
        ? `${month.count} ${month.count === 1 ? 'TORNEO' : 'TORNEOS'} ESTE MES`
        : 'SIN TORNEOS ESTE MES'
    content = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '1080px',
          height: '1920px',
          backgroundColor: BG,
          color: INK,
          padding: '230px 72px 200px',
          fontFamily: 'Archivo',
        }}
      >
        <Brand logoDataUrl={logoDataUrl} accent={accent.base} center />

        <span
          style={{
            fontSize: 32,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: accent.base,
            fontWeight: 700,
            marginTop: 48,
          }}
        >
          {EYEBROW}
        </span>
        <span
          style={{
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -2,
            textTransform: 'uppercase',
            lineHeight: 1,
            marginTop: 14,
          }}
        >
          {month.label}
        </span>

        {/* Encabezado de días */}
        <div style={{ display: 'flex', marginTop: 56 }}>
          {WEEKDAYS.map((w, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                width: CELL,
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                color: MUTED,
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Semanas */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex' }}>
              {week.map((day, di) => {
                const on = day != null && dayset.has(day)
                return (
                  <div
                    key={di}
                    style={{
                      display: 'flex',
                      width: CELL,
                      height: CELL,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 8,
                    }}
                  >
                    {day != null ? (
                      <div
                        style={{
                          display: 'flex',
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 20,
                          fontSize: 40,
                          fontWeight: on ? 800 : 500,
                          backgroundColor: on ? accent.base : 'transparent',
                          color: on ? '#ffffff' : MUTED,
                        }}
                      >
                        {day}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: accent.base,
            marginTop: 48,
          }}
        >
          {summary}
        </span>

        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: MUTED,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {CTA}
          </span>
          <div
            style={{
              display: 'flex',
              marginTop: 16,
              borderRadius: 24,
              border: `3px solid ${accent.base}`,
              backgroundColor: `rgba(${accent.rgb},0.12)`,
              padding: '22px 36px',
            }}
          >
            <span
              style={{
                fontSize: 34,
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
  } else if (style === 'b') {
    // Marcador: tablero noche, banda de acento, cantidad de torneos como marcador.
    const big = hasTournaments ? String(tournamentCount) : 'PRONTO'
    const subline = hasTournaments ? 'TORNEOS VIGENTES' : 'NUEVOS TORNEOS'
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
          <BrandLockup
            logoDataUrl={logoDataUrl}
            name={establishmentName}
            ink="#ffffff"
            logoSize={120}
            nameSize={34}
            center
          />

          <div style={{ display: 'flex', flexGrow: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 32,
                letterSpacing: 10,
                textTransform: 'uppercase',
                color: accent.base,
                fontWeight: 700,
              }}
            >
              {EYEBROW}
            </span>
            <span
              style={{
                // El número entra gigante; "PRONTO" (texto, 6 letras) se achica
                // para no desbordar el ancho útil del tablero.
                fontSize: hasTournaments ? 420 : 170,
                fontWeight: 800,
                letterSpacing: hasTournaments ? -20 : -6,
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
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 60,
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
              {CTA}
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
    // Ficha editorial clara: club como titular en acento + cantidad.
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
        <Brand logoDataUrl={logoDataUrl} accent={accent.base} center />

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
              fontSize: nameSize(establishmentName),
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 0.9,
              textTransform: 'uppercase',
              color: accent.base,
              marginTop: 18,
            }}
          >
            {establishmentName}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 64 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #dcdfe7',
              padding: '26px 0',
              fontSize: 40,
            }}
          >
            <span style={{ color: '#69728a', fontWeight: 700 }}>Torneos vigentes</span>
            <span style={{ fontWeight: 800 }}>
              {hasTournaments ? String(tournamentCount) : '—'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #dcdfe7',
              padding: '26px 0',
              fontSize: 40,
            }}
          >
            <span style={{ color: '#69728a', fontWeight: 700 }}>Actualización</span>
            <span style={{ fontWeight: 800 }}>Automática</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: accent.base }}>
            {CTA}
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
    // 'a' Afiche: noche, el nombre del club como héroe + pill de cupos de torneos.
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
        <Brand logoDataUrl={logoDataUrl} accent={accent.base} center />

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
          {EYEBROW}
        </span>
        <span
          style={{
            display: 'flex',
            fontSize: nameSize(establishmentName),
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 0.9,
            textTransform: 'uppercase',
            marginTop: 18,
          }}
        >
          {establishmentName}
        </span>

        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            marginTop: 44,
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
          {countUpper}
        </div>

        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: MUTED,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {CTA}
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
