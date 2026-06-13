/**
 * Script para generar data fake de solicitudes (pairs) en un torneo.
 * Uso: npm run seed-registrations -- <tournament-id> [num-pairs]
 *
 * Ejemplo: npm run seed-registrations -- 3fa8... 12
 * Crea 12 parejas falsas con jugadores fake en ese torneo.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(URL, KEY)

// Datos fake
const firstNames = [
  'Juan', 'Pedro', 'Carlos', 'Diego', 'Andrés', 'Felipe', 'Lucas', 'Martín',
  'Mariana', 'Sofia', 'Lucia', 'Catalina', 'Alejandra', 'Valentina', 'Camila', 'Paula'
]
const lastNames = [
  'González', 'Rodríguez', 'García', 'Martínez', 'López', 'Fernández', 'Pérez',
  'Sánchez', 'Torres', 'Díaz', 'Vargas', 'Ramírez', 'Cortés', 'Morales', 'Silva'
]

const domains = ['gmail.com', 'hotmail.com', 'outlook.com']

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomName() {
  return `${randomItem(firstNames)} ${randomItem(lastNames)}`
}

function randomEmail(name) {
  const base = name.toLowerCase().replace(/\s+/g, '.')
  const domain = randomItem(domains)
  return `${base}${Math.random().toString().slice(2, 5)}@${domain}`
}

function randomPhone() {
  return `+54 9 ${Math.floor(Math.random() * 9000000) + 1000000}`
}

function randomDNI() {
  return String(Math.floor(Math.random() * 90000000) + 10000000)
}

function randomStatus() {
  const rand = Math.random()
  if (rand < 0.6) return 'pending'
  if (rand < 0.85) return 'accepted'
  return 'rejected'
}

function randomToken() {
  return Math.random().toString(36).substring(2, 34)
}

async function main() {
  const tournamentId = process.argv[2]
  const numPairs = parseInt(process.argv[3] || '12', 10)

  if (!tournamentId) {
    console.error('✖ Uso: npm run seed-registrations -- <tournament-id> [num-pairs]')
    process.exit(1)
  }

  console.log(`→ Generando ${numPairs} solicitudes de inscripción para ${tournamentId}\n`)

  // Verifica que el torneo existe
  const { data: tournament, error: tourError } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('id', tournamentId)
    .single()

  if (tourError || !tournament) {
    console.error(`✖ Torneo no encontrado: ${tournamentId}`)
    process.exit(1)
  }

  console.log(`✓ Torneo encontrado: "${tournament.name}" (${tournament.status})\n`)

  let createdPlayers = 0
  let createdPairs = 0

  for (let i = 0; i < numPairs; i++) {
    // Crea dos players fake
    const player1Name = randomName()
    const player2Name = randomName()

    const { data: p1, error: p1Error } = await supabase
      .from('players')
      .insert({
        full_name: player1Name,
        email: randomEmail(player1Name),
        phone: randomPhone(),
        dni: randomDNI(),
      })
      .select('id')
      .single()

    if (p1Error) {
      console.error(`✖ Error creando player 1: ${p1Error.message}`)
      continue
    }

    const { data: p2, error: p2Error } = await supabase
      .from('players')
      .insert({
        full_name: player2Name,
        email: randomEmail(player2Name),
        phone: randomPhone(),
        dni: randomDNI(),
      })
      .select('id')
      .single()

    if (p2Error) {
      console.error(`✖ Error creando player 2: ${p2Error.message}`)
      continue
    }

    createdPlayers += 2

    // Crea la pareja
    const token = randomToken()
    const status = randomStatus()

    const { data: pair, error: pairError } = await supabase
      .from('pairs')
      .insert({
        tournament_id: tournamentId,
        player1_id: p1.id,
        player2_id: p2.id,
        lookup_token: token,
        status: status,
      })
      .select('id')
      .single()

    if (pairError) {
      console.error(`✖ Error creando pareja: ${pairError.message}`)
      continue
    }

    createdPairs++

    const statusLabel = {
      pending: '⏳ pendiente',
      accepted: '✓ aceptada',
      rejected: '✗ rechazada',
    }[status]

    console.log(`  ${i + 1}. ${player1Name} / ${player2Name} — ${statusLabel}`)
  }

  console.log(
    `\n✓ Completado: ${createdPairs} parejas, ${createdPlayers} jugadores creados.\n`
  )
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
