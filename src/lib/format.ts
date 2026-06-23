/** Formateo de fechas en es-AR, compartido por UI pública y de organizador. */

/** '2026-07-18' → '18 de julio de 2026' */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

/**
 * '2026-06-27' → 'Sábado 27 de junio' (día de semana, sin año), para los afiches
 * de difusión. Se arma en dos pasos para evitar la coma que mete el locale tras
 * el weekday ("sábado, 27 de junio") y se capitaliza la inicial.
 */
export function formatStoryDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(d)
  const dayMonth = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
  }).format(d)
  const label = `${weekday} ${dayMonth}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** ISO timestamptz → '1 jul, 10:00' */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** ISO timestamptz → valor para <input type="datetime-local"> ('YYYY-MM-DDTHH:mm'), hora local. */
export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
