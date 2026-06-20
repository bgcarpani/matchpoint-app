/**
 * Tira de KPIs del panel del organizer (estilo marcador): cada tile muestra un
 * número grande en fuente mono y una etiqueta. `accent` resalta el dato accionable
 * (solicitudes pendientes) en color de atención.
 */
export interface DashboardStat {
  label: string
  value: number
  accent?: 'warning'
}

export function DashboardStats({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="elevate rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <div
            className={`font-mono tnum text-2xl font-bold leading-none ${
              s.accent === 'warning' && s.value > 0
                ? 'text-[color:var(--warning)]'
                : 'text-foreground'
            }`}
          >
            {s.value}
          </div>
          <div className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}
