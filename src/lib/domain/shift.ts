import type { ShiftStatus } from '@/lib/types/database'

/** Vista pública de un turno (sin `manage_token`). */
export interface PublicShift {
  id: string
  court_name: string
  start_time: string
  slots_needed: number
  category: string | null
  notes: string | null
  creator_name: string
  whatsapp: string
  instagram: string | null
  status: ShiftStatus
}

/** Columnas seguras para la lista pública — nunca incluye `manage_token`. */
export const PUBLIC_SHIFT_COLUMNS =
  'id, court_name, start_time, slots_needed, category, notes, creator_name, whatsapp, instagram, status'

/** Ventana de gracia: un turno sigue visible hasta 30 min después de su hora. */
export const EXPIRY_GRACE_MINUTES = 30

/** ISO del corte de expiración (ahora − 30 min) para filtrar la query. */
export function expiryCutoffISO(now: Date = new Date()): string {
  return new Date(now.getTime() - EXPIRY_GRACE_MINUTES * 60_000).toISOString()
}

/** '2026-07-04T19:30' → 'Hoy · 19:30' / 'Mañana · 19:30' / 'Vie 4 · 19:30'. */
export function formatShiftWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const time = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)

  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate())
  const diffDays = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000
  )

  let day: string
  if (diffDays === 0) day = 'Hoy'
  else if (diffDays === 1) day = 'Mañana'
  else {
    const label = new Intl.DateTimeFormat('es-AR', {
      weekday: 'short',
      day: 'numeric',
    }).format(d)
    day = label.charAt(0).toUpperCase() + label.slice(1)
  }
  return `${day} · ${time}`
}

/** 'Faltan 2' / 'Falta 1'. */
export function slotsLabel(slots: number): string {
  return slots === 1 ? 'Falta 1' : `Faltan ${slots}`
}

/**
 * Deep link a WhatsApp para CONTACTAR al creador, con mensaje corto pre-llenado.
 * El número se guarda sin prefijo; `wa.me` requiere el internacional completo →
 * se antepone `549` (Argentina móvil).
 */
export function whatsappLink(shift: PublicShift): string {
  const when = formatShiftWhen(shift.start_time)
  const text = `Hola ${shift.creator_name}! Vi tu turno (${when}). ¿Sigue libre?`
  return `https://wa.me/549${shift.whatsapp}?text=${encodeURIComponent(text)}`
}

/**
 * Link para COMPARTIR el turno (el creador lo manda a un grupo). Sin número:
 * `wa.me/?text=` abre el selector de chat/grupo de WhatsApp. Incluye un link al
 * tablero para que quien lo vea pueda entrar y contactar.
 */
export function shareWhatsappLink(shift: PublicShift, boardUrl: string): string {
  const when = formatShiftWhen(shift.start_time)
  const cat = shift.category ? ` - ${shift.category}` : ''
  const text =
    `${slotsLabel(shift.slots_needed)} para jugar\n` +
    `${shift.court_name}\n` +
    `${when}${cat}\n` +
    `Sumate: ${boardUrl}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** Perfil de Instagram del creador (abre el DM manualmente). */
export function instagramLink(handle: string): string {
  return `https://instagram.com/${handle}`
}

/** '+54 9 11 2345-6789' aproximado para mostrar (no para el link). */
export function displayWhatsapp(digits: string): string {
  return `+54 9 ${digits}`
}
