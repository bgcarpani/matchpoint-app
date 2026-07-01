'use client'

import { DateField } from '@/components/form/date-field'
import { Segmented } from '@/components/form/segmented'

/** Estado del formulario de turno (fecha y hora separadas para los pickers). */
export interface ShiftFormState {
  court_name: string
  date: string // 'YYYY-MM-DD'
  time: string // 'HH:mm'
  slots: 1 | 2 | 3 | 4
  category: string
  notes: string
  creator_name: string
  whatsapp: string
  instagram: string
}

export const emptyShiftState: ShiftFormState = {
  court_name: '',
  date: '',
  time: '',
  slots: 2,
  category: '',
  notes: '',
  creator_name: '',
  whatsapp: '',
  instagram: '',
}

const SLOT_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
] as const

const inputClass =
  'mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-volt focus:ring-1 focus:ring-volt'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

/**
 * Campos controlados del formulario de turno, compartidos por crear y editar.
 * El estado vive en el componente padre (evita chocar con el React Compiler).
 */
export function ShiftFields({
  state,
  onChange,
}: {
  state: ShiftFormState
  onChange: (patch: Partial<ShiftFormState>) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <label className="block">
        <Label>Cancha / Club</Label>
        <input
          value={state.court_name}
          onChange={(e) => onChange({ court_name: e.target.value })}
          placeholder="Ej. Padel God — Cancha 3"
          required
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <DateField
          label="Fecha"
          value={state.date}
          onChange={(v) => onChange({ date: v })}
          fromToday
        />
        <label className="block">
          <Label>Hora</Label>
          <input
            type="time"
            value={state.time}
            onChange={(e) => onChange({ time: e.target.value })}
            required
            className="mt-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-volt focus:ring-1 focus:ring-volt"
          />
        </label>
      </div>

      <div>
        <Label>Jugadores que faltan</Label>
        <div className="mt-2">
          <Segmented
            value={String(state.slots)}
            onChange={(v) =>
              onChange({ slots: Number(v) as ShiftFormState['slots'] })
            }
            options={SLOT_OPTIONS}
          />
        </div>
      </div>

      <label className="block">
        <Label>Categoría (opcional)</Label>
        <input
          value={state.category}
          onChange={(e) => onChange({ category: e.target.value })}
          placeholder="Ej. 5ta, mixto, principiantes"
          className={inputClass}
        />
      </label>

      <label className="block">
        <Label>Notas (opcional)</Label>
        <textarea
          value={state.notes}
          onChange={(e) => onChange({ notes: e.target.value.slice(0, 140) })}
          placeholder="Ej. traigan pelotas"
          rows={2}
          maxLength={140}
          className={inputClass}
        />
        <span className="mt-1 block text-right text-xs text-muted-foreground tnum">
          {state.notes.length}/140
        </span>
      </label>

      <div className="border-t border-border pt-5">
        <label className="block">
          <Label>Tu nombre</Label>
          <input
            value={state.creator_name}
            onChange={(e) => onChange({ creator_name: e.target.value })}
            placeholder="Nombre y apellido"
            required
            className={inputClass}
          />
        </label>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block">
            <Label>WhatsApp</Label>
            <input
              value={state.whatsapp}
              onChange={(e) => onChange({ whatsapp: e.target.value })}
              inputMode="numeric"
              placeholder="11 2345 6789"
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <Label>Instagram (opcional)</Label>
            <input
              value={state.instagram}
              onChange={(e) => onChange({ instagram: e.target.value })}
              placeholder="@usuario"
              className={inputClass}
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Tu WhatsApp (y tu Instagram, si lo cargás) van a ser visibles para
          cualquiera que vea el tablero. Así te contactan para sumarse.
        </p>
      </div>
    </div>
  )
}

/**
 * Convierte el estado del form a input de la Server Action. Devuelve un error de
 * validación amable (string) si algo falta, o el objeto listo para mandar.
 */
export function toShiftInput(
  s: ShiftFormState
):
  | { error: string }
  | {
      input: {
        court_name: string
        start_time: string
        slots_needed: number
        category?: string
        notes?: string
        creator_name: string
        whatsapp: string
        instagram?: string
      }
    } {
  if (s.court_name.trim().length < 2) return { error: 'Poné la cancha o club.' }
  if (!s.date) return { error: 'Elegí una fecha.' }
  if (!s.time) return { error: 'Elegí una hora.' }

  const start = new Date(`${s.date}T${s.time}`)
  if (Number.isNaN(start.getTime())) return { error: 'Fecha u hora inválida.' }

  const whatsappDigits = s.whatsapp.replace(/\D/g, '')
  if (whatsappDigits.length < 8) return { error: 'Ingresá un WhatsApp válido.' }
  if (s.creator_name.trim().length < 2) return { error: 'Poné tu nombre.' }

  return {
    input: {
      court_name: s.court_name.trim(),
      start_time: start.toISOString(),
      slots_needed: s.slots,
      category: s.category.trim() || undefined,
      notes: s.notes.trim() || undefined,
      creator_name: s.creator_name.trim(),
      whatsapp: whatsappDigits,
      instagram: s.instagram.trim() || undefined,
    },
  }
}

/** Próxima hora redonda: 15:20 → 16:00, 15:50 → 17:00. Formato 'HH:mm'. */
export function nextRoundHour(now: Date = new Date()): string {
  const d = new Date(now)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Date local → 'YYYY-MM-DD'. */
export function todayYMD(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
