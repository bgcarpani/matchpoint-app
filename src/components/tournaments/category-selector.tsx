'use client'

import { Segmented } from '@/components/form/segmented'
import {
  INDIVIDUAL_CATEGORIES,
  GENDER_LABELS,
} from '@/lib/domain/tournament'
import type { CategoryType, Gender } from '@/lib/types/database'

export interface CategoryState {
  category_type: CategoryType
  category_value: string
  gender: Gender
}

const TYPE_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: 'individual', label: 'Individual' },
  { value: 'suma', label: 'Suma' },
]

const GENDER_OPTIONS: { value: Gender; label: string }[] = (
  ['male', 'female', 'mixed'] as Gender[]
).map((g) => ({ value: g, label: GENDER_LABELS[g] }))

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-volt focus:ring-1 focus:ring-volt'

export function CategorySelector({
  value,
  onChange,
  error,
}: {
  value: CategoryState
  onChange: (v: CategoryState) => void
  error?: string
}) {
  function setType(category_type: CategoryType) {
    // Al cambiar el tipo, reseteamos el valor a uno válido para ese tipo.
    onChange({
      ...value,
      category_type,
      category_value: category_type === 'individual' ? '1ra' : '',
    })
  }

  return (
    <div className="grid gap-5 rounded-xl border border-border bg-card/30 p-5">
      <div>
        <Label>Tipo de categoría</Label>
        <div className="mt-2">
          <Segmented
            value={value.category_type}
            onChange={setType}
            options={TYPE_OPTIONS}
          />
        </div>
      </div>

      <div>
        {value.category_type === 'individual' ? (
          <>
            <Label>Categoría</Label>
            <select
              value={value.category_value}
              onChange={(e) =>
                onChange({ ...value, category_value: e.target.value })
              }
              className={`mt-2 ${inputClass}`}
            >
              {INDIVIDUAL_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-card text-foreground">
                  {c}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <Label>Suma de categorías</Label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={value.category_value}
              onChange={(e) =>
                onChange({ ...value, category_value: e.target.value })
              }
              placeholder="Ej. 14"
              className={`mt-2 ${inputClass}`}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Suma de las categorías de ambos jugadores (ej. 8va + 6ta = 14).
            </p>
          </>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}
      </div>

      <div>
        <Label>Género</Label>
        <div className="mt-2">
          <Segmented
            value={value.gender}
            onChange={(gender) => onChange({ ...value, gender })}
            options={GENDER_OPTIONS}
          />
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}
