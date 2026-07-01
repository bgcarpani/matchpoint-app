'use client'

/**
 * Persistencia del creador de turnos en el mismo dispositivo (sin login).
 * `myShiftTokens` = mapa `{ [shiftId]: manageToken }` para volver a editar sin el
 * link; `lastWhatsapp` pre-llena el form de creación. Todo tolerante a fallos
 * (modo incógnito / storage deshabilitado).
 */

export const MY_SHIFT_TOKENS_KEY = 'myShiftTokens'
export const LAST_WHATSAPP_KEY = 'lastWhatsapp'

type TokenMap = Record<string, string>

function readTokens(): TokenMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(MY_SHIFT_TOKENS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as TokenMap) : {}
  } catch {
    return {}
  }
}

/** Guarda el token de gestión de un turno recién creado + el último WhatsApp. */
export function rememberShiftToken(
  id: string,
  token: string,
  whatsapp?: string
): void {
  if (typeof window === 'undefined') return
  try {
    const tokens = readTokens()
    tokens[id] = token
    window.localStorage.setItem(MY_SHIFT_TOKENS_KEY, JSON.stringify(tokens))
    if (whatsapp) window.localStorage.setItem(LAST_WHATSAPP_KEY, whatsapp)
  } catch {
    // storage no disponible — el link de gestión sigue funcionando igual.
  }
}

/** Olvida un turno (al eliminarlo o cerrarlo desde el dispositivo del creador). */
export function forgetShiftToken(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const tokens = readTokens()
    if (id in tokens) {
      delete tokens[id]
      window.localStorage.setItem(MY_SHIFT_TOKENS_KEY, JSON.stringify(tokens))
    }
  } catch {
    // ignorar
  }
}

/** Devuelve el token de gestión guardado para un turno, o null. */
export function getShiftToken(id: string): string | null {
  return readTokens()[id] ?? null
}

/** Todos los IDs de turnos creados en este dispositivo. */
export function getMyShiftIds(): string[] {
  return Object.keys(readTokens())
}
