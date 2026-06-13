'use client'

import { Segmented } from '@/components/form/segmented'
import { SCORING_MODE_LABELS, GAMES_PER_SET_OPTIONS } from '@/lib/domain/match'
import type { ScoringMode } from '@/lib/types/database'

const MODE_OPTIONS: { value: ScoringMode; label: string }[] = (
  ['games', 'best_of_3_sets'] as ScoringMode[]
).map((m) => ({ value: m, label: SCORING_MODE_LABELS[m] }))

const SET_OPTIONS = GAMES_PER_SET_OPTIONS.map((n) => ({
  value: String(n),
  label: `${n} games`,
}))

/**
 * Selector de scoring del torneo (estado local, igual que CategorySelector).
 * El valor queda fijado al crear; la edición sólo está disponible en borrador.
 */
export function ScoringSelector({
  mode,
  gamesPerSet,
  onModeChange,
  onGamesPerSetChange,
}: {
  mode: ScoringMode
  gamesPerSet: number
  onModeChange: (m: ScoringMode) => void
  onGamesPerSetChange: (n: number) => void
}) {
  return (
    <div className="grid gap-5 rounded-xl border border-border bg-card/30 p-5">
      <div>
        <Label>Formato de resultado</Label>
        <div className="mt-2">
          <Segmented value={mode} onChange={onModeChange} options={MODE_OPTIONS} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {mode === 'games'
            ? 'Un set por partido: gana la pareja con más games.'
            : 'Se gana al ganar 2 sets; se carga el detalle por set.'}
        </p>
      </div>

      <div>
        <Label>Largo del set</Label>
        <div className="mt-2">
          <Segmented
            value={String(gamesPerSet)}
            onChange={(v) => onGamesPerSetChange(Number(v))}
            options={SET_OPTIONS}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Games que define el set (el ganador debe alcanzarlo).
        </p>
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
