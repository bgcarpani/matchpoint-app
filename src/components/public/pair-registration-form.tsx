'use client'

import { useState } from 'react'
import type { TournamentStatus } from '@/lib/types/database'
import { STATUS_LABELS } from '@/lib/domain/tournament'

interface PlayerInput {
  full_name: string
  email: string
  phone: string
  dni: string
}

const emptyPlayer: PlayerInput = { full_name: '', email: '', phone: '', dni: '' }

interface Props {
  tournamentId: string
  canRegister: boolean
  status: TournamentStatus
  requestsFull: boolean
  slotsLeft: number
}

export function PairRegistrationForm({
  canRegister,
  status,
  requestsFull,
  slotsLeft,
}: Props) {
  const [players, setPlayers] = useState<[PlayerInput, PlayerInput]>([
    { ...emptyPlayer },
    { ...emptyPlayer },
  ])
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function update(i: 0 | 1, field: keyof PlayerInput, value: string) {
    setPlayers((prev) => {
      const next = [...prev] as [PlayerInput, PlayerInput]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  function validate(): string | null {
    for (let i = 0; i < 2; i++) {
      const p = players[i]
      if (!p.full_name.trim()) return `Falta el nombre del jugador ${i + 1}.`
      if (!p.email.trim() && !p.phone.trim())
        return `El jugador ${i + 1} necesita email o teléfono.`
    }
    return null
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    // TODO(slice inscripción): POST a /api/public/tournaments/[id]/register
    // (admin client server-side) y usar el lookup_token devuelto.
    // Por ahora generamos un token de previsualización.
    setToken(crypto.randomUUID())
  }

  if (token) {
    const link = `/inscription/${token}`
    return (
      <div className="rounded-2xl border border-volt/30 bg-card/60 p-6 sm:p-8">
        <div className="flex size-10 items-center justify-center rounded-full bg-volt text-volt-foreground">
          ✓
        </div>
        <h3 className="font-display mt-5 text-2xl text-foreground">
          Solicitud enviada
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Guardá este enlace privado para seguir el estado de tu pareja sin
          cuenta.
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
          <code className="flex-1 truncate text-xs text-foreground">{link}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(link)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-accent"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Vista previa — la inscripción se conectará al backend en el próximo
          slice.
        </p>
      </div>
    )
  }

  if (!canRegister) {
    return (
      <div className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
        <SectionTitle>Inscripción</SectionTitle>
        <p className="mt-4 text-sm text-foreground">
          {requestsFull
            ? 'Se alcanzó el cupo de solicitudes para este torneo.'
            : `La inscripción no está abierta. Estado actual: ${STATUS_LABELS[status]}.`}
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8"
    >
      <div className="flex items-center justify-between">
        <SectionTitle>Inscribir pareja</SectionTitle>
        <span className="text-xs text-muted-foreground tnum">
          {slotsLeft} cupos
        </span>
      </div>

      {[0, 1].map((i) => (
        <fieldset key={i} className="mt-6">
          <legend className="font-display text-sm text-volt">
            Jugador {i + 1}
          </legend>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <Field
              label="Nombre completo"
              required
              value={players[i].full_name}
              onChange={(v) => update(i as 0 | 1, 'full_name', v)}
              placeholder="Nombre y apellido"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Email"
                type="email"
                value={players[i].email}
                onChange={(v) => update(i as 0 | 1, 'email', v)}
                placeholder="email@ejemplo.com"
              />
              <Field
                label="Teléfono"
                value={players[i].phone}
                onChange={(v) => update(i as 0 | 1, 'phone', v)}
                placeholder="+54 9 ..."
              />
            </div>
            <Field
              label="DNI (opcional)"
              value={players[i].dni}
              onChange={(v) => update(i as 0 | 1, 'dni', v)}
              placeholder="Identificador"
            />
          </div>
        </fieldset>
      ))}

      <p className="mt-4 text-xs text-muted-foreground">
        Cada jugador requiere nombre y al menos un contacto (email o teléfono).
      </p>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="font-display mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3.5 text-base text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105"
      >
        Enviar solicitud →
      </button>
    </form>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h3>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-volt focus:ring-1 focus:ring-volt"
      />
    </label>
  )
}
