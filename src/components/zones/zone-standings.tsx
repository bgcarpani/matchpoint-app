import { sortStandings, type StandingRow } from '@/lib/domain/zone'

/**
 * Tabla de posiciones de una zona. Presentacional puro (sin estado): la usan
 * tanto el área organizer (cliente) como la vista pública (server). El orden lo
 * resuelve `sortStandings` (posición congelada o, en vivo, puntos → dif. games).
 */
export function ZoneStandings({
  rows,
  frozen,
}: {
  rows: StandingRow[]
  frozen: boolean
}) {
  if (rows.length === 0) return null
  const sorted = sortStandings(rows)

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-secondary text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Pareja</th>
            <th className="px-2 py-2 text-center font-semibold" title="Jugados">
              PJ
            </th>
            <th className="px-2 py-2 text-center font-semibold" title="Ganados">
              G
            </th>
            <th className="px-2 py-2 text-center font-semibold" title="Perdidos">
              P
            </th>
            <th
              className="px-2 py-2 text-center font-semibold"
              title="Diferencia de games"
            >
              DG
            </th>
            <th className="px-2 py-2 text-center font-semibold" title="Puntos">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={row.pairId}
              className="border-t border-border text-foreground"
            >
              <td className="px-3 py-2 tnum text-muted-foreground">
                {row.position ?? i + 1}
              </td>
              <td className="px-3 py-2">{row.label}</td>
              <td className="px-2 py-2 text-center tnum text-muted-foreground">
                {row.played}
              </td>
              <td className="px-2 py-2 text-center tnum">{row.won}</td>
              <td className="px-2 py-2 text-center tnum text-muted-foreground">
                {row.lost}
              </td>
              <td className="px-2 py-2 text-center tnum">
                {row.gamesDiff > 0 ? `+${row.gamesDiff}` : row.gamesDiff}
              </td>
              <td className="px-2 py-2 text-center font-semibold tnum">
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {frozen && (
        <p className="bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
          Posiciones cerradas.
        </p>
      )}
    </div>
  )
}
