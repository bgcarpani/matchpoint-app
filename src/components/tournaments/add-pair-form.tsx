'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addPairManually } from '@/app/tournaments/[id]/registrations/actions'

interface PlayerInput {
  full_name: string
  email: string
  phone: string
  dni: string
}

const emptyPlayer: PlayerInput = { full_name: '', email: '', phone: '', dni: '' }
const emptyPlayers = (): [PlayerInput, PlayerInput] => [
  { ...emptyPlayer },
  { ...emptyPlayer },
]

/**
 * Carga manual de una pareja por el organizer, inline en la página de
 * inscripciones. Espeja la validación del alta pública (nombre + un contacto por
 * jugador) pero la pareja entra ACEPTADA directa (ver `addPairManually`). Estado
 * controlado con useState (no RHF) por consistencia con `PairRegistrationForm` y
 * la regla de React Compiler de CLAUDE.md.
 */
export function AddPairForm({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [players, setPlayers] = useState<[PlayerInput, PlayerInput]>(
    emptyPlayers
  )
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const [pending, startTransition] = useTransition()

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
    const e1 = players[0].email.trim().toLowerCase()
    const e2 = players[1].email.trim().toLowerCase()
    if (e1 && e2 && e1 === e2)
      return 'Los dos jugadores no pueden tener el mismo email.'
    return null
  }

  function reset() {
    setPlayers(emptyPlayers())
    setError(null)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addPairManually({
        tournament_id: tournamentId,
        player1: players[0],
        player2: players[1],
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      reset()
      setOpen(false)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setAdded(false)
            setOpen(true)
          }}
          className="font-display inline-flex items-center gap-2 rounded-lg bg-volt px-4 py-2.5 text-sm text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105"
        >
          <span className="text-base leading-none">+</span> Agregar pareja
        </button>
        {added && (
          <span className="text-sm text-volt">✓ Pareja agregada</span>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-volt/30 bg-card/50 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">Agregar pareja</h3>
        <button
          type="button"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        La pareja entra <span className="text-foreground">aceptada</span> y cuenta
        para el cupo del torneo.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <fieldset key={i} className="min-w-0">
            <legend className="font-display text-sm text-volt">
              Jugador {i + 1}
            </legend>
            <div className="mt-3 grid gap-3">
              <Field
                label="Nombre completo"
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
                  placeholder="+54 9 …"
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
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Cada jugador requiere nombre y al menos un contacto (email o teléfono).
      </p>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="font-display inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-5 py-2.5 text-sm text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105 disabled:opacity-60"
        >
          {pending ? 'Agregando…' : 'Agregar pareja'}
        </button>
        <button
          type="button"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-volt focus:ring-1 focus:ring-volt"
      />
    </label>
  )
}
