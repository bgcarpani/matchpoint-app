'use client'

import { useSyncExternalStore } from 'react'
import { getShiftToken } from './storage'

/**
 * Hooks para leer estado client-only (localStorage) sin `setState` en efectos
 * (prohibido por el React Compiler) ni mismatch de hidratación: `useSyncExternalStore`
 * usa el snapshot del server en el primer render y recién después el del cliente.
 */

function subscribeStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

/** Token de gestión guardado para un turno (o null). Reacciona a cambios de storage. */
export function useShiftToken(id: string): string | null {
  return useSyncExternalStore(
    subscribeStorage,
    () => getShiftToken(id),
    () => null
  )
}

/** `false` en server y primer render; `true` tras montar. Para seedear estado client-only. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
