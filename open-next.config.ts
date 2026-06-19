import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Config mínima: sin caché incremental en R2 por ahora (primer deploy simple).
// Si más adelante se usa ISR/revalidate intensivo, agregar r2IncrementalCache
// + un bucket R2 en wrangler.jsonc. Ver https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig({})
