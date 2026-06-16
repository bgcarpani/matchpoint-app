'use client'

export type BracketViewMode = 'cuadro' | 'lista'

/**
 * Conmutador Cuadro / Lista para las vistas de llaves (pública y organizador).
 * "Cuadro" = árbol; "Lista" = rondas apiladas (el formato previo).
 */
export function BracketViewToggle({
  view,
  onChange,
}: {
  view: BracketViewMode
  onChange: (v: BracketViewMode) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border">
      {(['cuadro', 'lista'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-pressed={view === mode}
          className={`px-3 py-1.5 text-xs font-semibold capitalize transition ${
            view === mode
              ? 'bg-volt text-volt-foreground'
              : 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  )
}
