'use client'

import { useEffect, useRef, useState } from 'react'
import { QrCode } from 'lucide-react'

/**
 * Carousel del hero del landing: rota solo entre varias "caras" del producto
 * (llaves, posiciones, calendario/QR, campeón). Mock estático tematizado, sin
 * imágenes pesadas. Ver spec-v3-2.md Feature C.
 *
 * - Auto-avanza cada ~4.5s con crossfade; pausa en hover y focus-within.
 * - Respeta `prefers-reduced-motion`: sin auto-avance ni transición (el usuario
 *   cambia con los dots).
 * - Accesible: role/group + dots como botones con aria-current.
 */
const SLIDES = [
  { key: 'llaves', label: 'Llaves · Final', node: <BracketSlide /> },
  { key: 'posiciones', label: 'Zona A · Posiciones', node: <StandingsSlide /> },
  { key: 'calendario', label: 'Calendario · QR', node: <CalendarSlide /> },
  { key: 'campeon', label: 'Campeón', node: <ChampionSlide /> },
] as const

const INTERVAL = 4500

export function ShowcaseCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (paused || reduced.current) return
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      INTERVAL
    )
    return () => clearInterval(id)
  }, [paused, index])

  return (
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label="Vistas del producto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative h-[300px]">
        {SLIDES.map((slide, i) => {
          const active = i === index
          return (
            <div
              key={slide.key}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-500 ${
                active
                  ? 'z-10 opacity-100'
                  : 'pointer-events-none z-0 opacity-0'
              }`}
            >
              <SlideCard label={slide.label}>{slide.node}</SlideCard>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {SLIDES.map((slide, i) => {
          const active = i === index
          return (
            <button
              key={slide.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver ${slide.label}`}
              aria-current={active}
              className={`h-1.5 rounded-full transition-all ${
                active ? 'w-6 bg-volt' : 'w-1.5 bg-border hover:bg-muted-foreground'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------ contenedor ------------------------------ */

function SlideCard({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="elevate-lg flex h-full flex-col rounded-2xl border border-border bg-card p-5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-4 flex flex-1 flex-col justify-center">{children}</div>
    </div>
  )
}

/* -------------------------------- slides -------------------------------- */

function BracketSlide() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)] items-center gap-0">
      <div className="flex min-w-0 flex-col gap-5">
        <BracketPair top={['Pérez / Gómez', '6']} bottom={['Vega / Mai', '3']} />
        <BracketPair top={['Ruiz / Sosa', '7']} bottom={['Díaz / Mol', '5']} />
      </div>
      <div className="flex justify-center text-muted-foreground/50" aria-hidden>
        <ChevronRight />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <ScorePill name="Pérez / Gómez" score="6" winner />
        <ScorePill name="Ruiz / Sosa" score="4" />
        <div className="mt-1 rounded-xl bg-volt px-3 py-2.5 text-volt-foreground">
          <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] opacity-90">
            <TrophyMini /> Campeón
          </span>
          <span className="font-display mt-1 block text-sm leading-none">
            Pérez / Gómez
          </span>
        </div>
      </div>
    </div>
  )
}

function StandingsSlide() {
  const rows = [
    { pos: 1, name: 'Pérez / Gómez', pj: 3, dg: '+8', pts: 6, leader: true },
    { pos: 2, name: 'Ruiz / Sosa', pj: 3, dg: '+2', pts: 4 },
    { pos: 3, name: 'Vega / Mai', pj: 3, dg: '−3', pts: 2 },
    { pos: 4, name: 'Díaz / Mol', pj: 3, dg: '−7', pts: 0 },
  ]
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[1.2rem_1fr_1.6rem_2rem_1.8rem] items-center gap-2 px-2 pb-1 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <span>#</span>
        <span>Pareja</span>
        <span className="text-right">PJ</span>
        <span className="text-right">DG</span>
        <span className="text-right">PTS</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.pos}
          className={`grid grid-cols-[1.2rem_1fr_1.6rem_2rem_1.8rem] items-center gap-2 rounded-md py-1.5 pr-2 text-xs ${
            r.leader
              ? 'border-l-2 border-volt bg-[color:var(--volt-surface)] pl-2 font-semibold text-volt-deep'
              : 'pl-2.5 text-foreground'
          }`}
        >
          <span className="font-mono tnum">{r.pos}</span>
          <span className="min-w-0 truncate">{r.name}</span>
          <span className="text-right font-mono tnum text-muted-foreground">
            {r.pj}
          </span>
          <span className="text-right font-mono tnum text-muted-foreground">
            {r.dg}
          </span>
          <span className="text-right font-mono tnum">{r.pts}</span>
        </div>
      ))}
    </div>
  )
}

function CalendarSlide() {
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-24 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-foreground">
        <QrCode className="size-16" strokeWidth={1.4} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">Pegalo en el club</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Un QR fijo que siempre muestra tus torneos vigentes. El contenido se
          actualiza solo.
        </p>
        <span className="mt-3 inline-flex rounded-md bg-volt/10 px-2.5 py-1 text-xs font-medium text-volt ring-1 ring-volt/30">
          matchup/o/tu-club
        </span>
      </div>
    </div>
  )
}

function ChampionSlide() {
  return (
    <div className="rounded-xl bg-volt px-5 py-6 text-volt-foreground">
      <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] opacity-90">
        <TrophyMini /> Pareja campeona
      </span>
      <span className="font-display mt-2 block text-2xl leading-none">
        Pérez / Gómez
      </span>
      <span className="mt-3 inline-flex rounded-full border border-volt-foreground/40 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]">
        6ta · Caballeros
      </span>
    </div>
  )
}

/* -------------------------------- piezas -------------------------------- */

function BracketPair({
  top,
  bottom,
}: {
  top: [string, string]
  bottom: [string, string]
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <ScorePill name={top[0]} score={top[1]} winner />
      <ScorePill name={bottom[0]} score={bottom[1]} />
    </div>
  )
}

function ScorePill({
  name,
  score,
  winner,
}: {
  name: string
  score: string
  winner?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs ${
        winner
          ? 'border-volt bg-[color:var(--volt-surface)]'
          : 'border-border bg-secondary'
      }`}
    >
      <span
        className={`min-w-0 flex-1 truncate ${
          winner ? 'font-bold text-volt-deep' : 'text-muted-foreground'
        }`}
      >
        {name}
      </span>
      <span
        className={`ml-2 shrink-0 font-mono tnum font-bold ${
          winner ? 'text-volt-deep' : 'text-muted-foreground'
        }`}
      >
        {score}
      </span>
    </div>
  )
}

function TrophyMini() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  )
}

function ChevronRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
