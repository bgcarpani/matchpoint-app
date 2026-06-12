/**
 * Aplica las migraciones SQL de supabase/migrations/ contra el proyecto Supabase
 * usando la Management API (POST /v1/projects/{ref}/database/query).
 *
 * Requiere (vía --env-file=.env.local):
 *   SUPABASE_ACCESS_TOKEN  -> Personal Access Token (sbp_...) de
 *                            https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF   -> fiueszzhsqrpcfpcczii
 *
 * Uso:
 *   npm run db:apply                 # aplica 0001 y 0002 en orden
 *   npm run db:apply -- 0002         # aplica sólo los archivos que matcheen "0002"
 */
import { readFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = process.env.SUPABASE_PROJECT_REF

if (!TOKEN || TOKEN.startsWith('PEGAR') || !REF) {
  console.error(
    '✖ Faltan credenciales. Completá SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF en .env.local'
  )
  process.exit(1)
}

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'supabase',
  'migrations'
)

const filter = process.argv[2] // opcional: subcadena para filtrar archivos

async function runSql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — ${text}`)
  }
  return text
}

async function main() {
  const all = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => (filter ? f.includes(filter) : true))
    .sort()

  if (all.length === 0) {
    console.error('✖ No se encontraron migraciones para aplicar.')
    process.exit(1)
  }

  console.log(`→ Proyecto ${REF} · ${all.length} migración(es)\n`)

  for (const file of all) {
    const sql = await readFile(join(migrationsDir, file), 'utf8')
    process.stdout.write(`  • ${file} ... `)
    try {
      await runSql(sql)
      console.log('OK')
    } catch (err) {
      console.log('FALLÓ')
      console.error(`\n✖ Error en ${file}:\n${err.message}\n`)
      process.exit(1)
    }
  }

  console.log('\n✓ Migraciones aplicadas.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
