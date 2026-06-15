import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * El área autenticada del organizer nunca se cachea (sesión / PII): se sirve
 * siempre desde la red. Las vistas públicas (`/t/*`, `/o/*`, `/inscription/*`)
 * caen en `defaultCache` (NetworkFirst para documentos) → quedan disponibles
 * offline una vez visitadas, útil en clubes con wifi mala.
 */
const PROTECTED = /^\/(dashboard|courts|tournaments)(\/|$)/

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && PROTECTED.test(url.pathname),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
})

serwist.addEventListeners()
