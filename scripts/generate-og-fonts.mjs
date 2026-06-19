/**
 * Genera `src/lib/og/fonts.generated.ts` embebiendo los .ttf de Archivo como
 * base64. Motivo: las imágenes OG (next/og) corren en el worker de Cloudflare
 * (OpenNext), donde NO se puede `fetch(new URL(..., import.meta.url))` un asset
 * (workerd no resuelve URLs file://). Embeber la fuente en el bundle es el único
 * método 100% portable entre runtimes.
 *
 * Uso: `node scripts/generate-og-fonts.mjs` (correr si se cambian los .ttf).
 * La fuente de verdad sigue siendo `src/lib/og/fonts/*.ttf`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const fontsDir = join(here, '..', 'src', 'lib', 'og', 'fonts')
const out = join(here, '..', 'src', 'lib', 'og', 'fonts.generated.ts')

const weights = [400, 700, 800]
const entries = weights.map((w) => {
  const b64 = readFileSync(join(fontsDir, `archivo-${w}.ttf`)).toString('base64')
  return `  { weight: ${w}, data: '${b64}' },`
})

const content = `// GENERADO por scripts/generate-og-fonts.mjs — NO editar a mano.
// Fuente Archivo (400/700/800) embebida en base64 para next/og en Cloudflare Workers.
export const ARCHIVO_FONTS: { weight: 400 | 700 | 800; data: string }[] = [
${entries.join('\n')}
]
`

writeFileSync(out, content)
console.log(`Escrito ${out} (${weights.length} fuentes)`)
