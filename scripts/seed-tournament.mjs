/**
 * Genera un torneo populado para probar las vistas de zonas (y opcionalmente
 * llaves) sin cargar nada a mano.
 *
 * Uso: npm run seed:tournament -- [zonas] [parejas-por-zona] [email-organizer] [--full]
 * Ej:  npm run seed:tournament -- 4 4               (default: SOLO hasta zonas)
 *      npm run seed:tournament -- 4 4 --full        (zonas jugadas + bracket)
 *      npm run seed:tournament -- 2 4 bgcarpani@gmail.com
 *
 * Por defecto llega SOLO hasta las zonas: crea el torneo `in_progress`, las
 * parejas aceptadas, las zonas con sus parejas y los partidos round-robin
 * generados PERO sin resultados (status pending), sin standings y sin llaves.
 * Con `--full` además juega todas las zonas, congela posiciones y siembra +
 * juega el bracket hasta el campeón.
 *
 * Inserta directo con el service-role client (bypassa RLS): las RPCs
 * generate_zones / generate_bracket chequean owns_tournament(auth.uid()), que es
 * null fuera de una sesión, así que acá replicamos su lógica en JS.
 *
 * No es destructivo: cada corrida crea un torneo nuevo (nombre con timestamp).
 */
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(URL, KEY)

// --- Config por CLI ---------------------------------------------------------
const nums = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number)
const NUM_ZONES = nums[0] ?? 4
const PAIRS_PER_ZONE = nums[1] ?? 4
const FULL = process.argv.includes('--full')
const ORG_EMAIL = process.argv.find((a) => a.includes('@')) || null
const QUALIFIERS_PER_ZONE = 2

// --- Datos fake -------------------------------------------------------------
const firstNames = [
  'Juan', 'Pedro', 'Carlos', 'Diego', 'Andrés', 'Felipe', 'Lucas', 'Martín',
  'Mariana', 'Sofía', 'Lucía', 'Catalina', 'Alejandra', 'Valentina', 'Camila',
  'Paula', 'Tomás', 'Nicolás', 'Ramiro', 'Gonzalo', 'Bruno', 'Iván', 'Julián',
  'Federico', 'Agustín', 'Matías', 'Joaquín', 'Emilia', 'Renata', 'Pilar',
]
const lastNames = [
  'González', 'Rodríguez', 'García', 'Martínez', 'López', 'Fernández', 'Pérez',
  'Sánchez', 'Torres', 'Díaz', 'Vargas', 'Ramírez', 'Cortés', 'Morales',
  'Silva', 'Romero', 'Acosta', 'Benítez', 'Medina', 'Castro', 'Rojas', 'Ortiz',
]
const domains = ['gmail.com', 'hotmail.com', 'outlook.com']
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const rnd = (n) => Math.floor(Math.random() * n)
const name = () => `${pick(firstNames)} ${pick(lastNames)}`
const email = (n) => `${n.toLowerCase().replace(/\s+/g, '.')}${rnd(900) + 100}@${pick(domains)}`
const phone = () => `+54 9 ${rnd(9000000) + 1000000}`
const dni = () => String(rnd(90000000) + 10000000)

// Orden de siembra estándar para n posiciones: [1,8,5,4,3,6,7,2] para n=8.
function seedOrder(n) {
  let seed = [1]
  while (seed.length < n) {
    const m = seed.length * 2 + 1
    const next = []
    for (const x of seed) next.push(x, m - x)
    seed = next
  }
  return seed
}

// Un set a 6 games: ganador 6, perdedor 0..4 (o 7-5 a veces).
function gameScore() {
  if (Math.random() < 0.2) return [7, 5]
  return [6, rnd(5)]
}

async function insert(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select()
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

async function main() {
  const totalPairs = NUM_ZONES * PAIRS_PER_ZONE
  console.log(
    `→ Torneo: ${NUM_ZONES} zonas × ${PAIRS_PER_ZONE} parejas = ${totalPairs} parejas` +
      (FULL ? `, ${QUALIFIERS_PER_ZONE} clasifican por zona (modo --full).` : ' (solo hasta zonas).') +
      '\n'
  )

  // 1) Organizer ------------------------------------------------------------
  const { data: orgs, error: orgErr } = await supabase
    .from('organizers')
    .select('id, email, establishment_name')
  if (orgErr) throw new Error(`organizers: ${orgErr.message}`)
  if (!orgs || orgs.length === 0) {
    console.error('✖ No hay organizers. Registrate en /register primero.')
    process.exit(1)
  }
  const org = ORG_EMAIL ? orgs.find((o) => o.email === ORG_EMAIL) : orgs[0]
  if (!org) {
    console.error(`✖ No encontré organizer con email ${ORG_EMAIL}.`)
    process.exit(1)
  }
  console.log(`✓ Organizer: ${org.establishment_name} (${org.email})`)

  // 2) Torneo ---------------------------------------------------------------
  const stamp = new Date().toISOString().slice(5, 16).replace('T', ' ')
  const date = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)
  const [tournament] = await insert('tournaments', [
    {
      organizer_id: org.id,
      name: `Torneo Demo ${stamp}`,
      status: 'in_progress',
      category_type: 'individual',
      category_value: '4ta',
      gender: 'male',
      tournament_date: date,
      max_pair_requests: Math.max(totalPairs + 4, totalPairs),
      max_pairs: totalPairs,
      scoring_mode: 'games',
      games_per_set: 6,
      qualifiers_per_zone: QUALIFIERS_PER_ZONE,
      bracket_published: false,
    },
  ])
  console.log(`✓ Torneo creado: "${tournament.name}" (${tournament.id})`)

  // 3) Canchas --------------------------------------------------------------
  const courts = await insert(
    'courts',
    Array.from({ length: 4 }, (_, i) => ({
      organizer_id: org.id,
      name: `Cancha ${i + 1}`,
      type: i % 2 === 0 ? 'indoor' : 'outdoor',
    }))
  )
  const courtId = () => pick(courts).id

  // 4) Players + Pairs (aceptadas) ------------------------------------------
  const playerRows = []
  for (let i = 0; i < totalPairs * 2; i++) {
    const n = name()
    playerRows.push({ full_name: n, email: email(n), phone: phone(), dni: dni() })
  }
  const players = await insert('players', playerRows)
  const pairRows = []
  for (let i = 0; i < totalPairs; i++) {
    pairRows.push({
      tournament_id: tournament.id,
      player1_id: players[i * 2].id,
      player2_id: players[i * 2 + 1].id,
      lookup_token: randomUUID().replace(/-/g, ''),
      status: 'accepted',
    })
  }
  const pairs = await insert('pairs', pairRows)
  console.log(`✓ ${pairs.length} parejas aceptadas (${players.length} jugadores)`)

  // 5) Zonas + zone_pairs + partidos round-robin ----------------------------
  // Sin --full: partidos pending (sin resultado), zonas SIN publicar ni congelar.
  const qualifiers = [] // sólo se usa en --full
  for (let z = 0; z < NUM_ZONES; z++) {
    const [zone] = await insert('zones', [
      {
        tournament_id: tournament.id,
        name: `Zona ${String.fromCharCode(65 + z)}`,
        is_published: FULL,
        match_format: 'round_robin',
        standings_frozen: FULL,
      },
    ])
    const zonePairs = pairs.slice(z * PAIRS_PER_ZONE, (z + 1) * PAIRS_PER_ZONE)
    await insert(
      'zone_pairs',
      zonePairs.map((p) => ({ zone_id: zone.id, pair_id: p.id }))
    )

    const stats = new Map(zonePairs.map((p) => [p.id, { won: 0, gf: 0, ga: 0 }]))
    const matchRows = []
    let round = 1
    for (let i = 0; i < zonePairs.length; i++) {
      for (let j = i + 1; j < zonePairs.length; j++) {
        const a = zonePairs[i].id
        const b = zonePairs[j].id
        const m = {
          zone_id: zone.id,
          round: round++,
          team1_pair_id: a,
          team2_pair_id: b,
          phase: 'zone',
          status: 'pending',
          court_id: null,
        }
        if (FULL) {
          const [w, l] = gameScore()
          const aWins = Math.random() < 0.5
          m.team1_score = aWins ? w : l
          m.team2_score = aWins ? l : w
          m.winner_pair_id = aWins ? a : b
          m.status = 'finished'
          m.court_id = courtId()
          stats.get(a).gf += m.team1_score; stats.get(a).ga += m.team2_score
          stats.get(b).gf += m.team2_score; stats.get(b).ga += m.team1_score
          stats.get(m.winner_pair_id).won += 1
        }
        matchRows.push(m)
      }
    }
    await insert('matches', matchRows)

    if (FULL) {
      const ranked = zonePairs
        .map((p) => {
          const s = stats.get(p.id)
          return { pairId: p.id, points: s.won * 2, diff: s.gf - s.ga, gf: s.gf }
        })
        .sort((x, y) => y.points - x.points || y.diff - x.diff || y.gf - x.gf)
      for (let pos = 0; pos < ranked.length; pos++) {
        const r = ranked[pos]
        const { error } = await supabase
          .from('zone_pairs')
          .update({ position: pos + 1, points: r.points })
          .eq('zone_id', zone.id)
          .eq('pair_id', r.pairId)
        if (error) throw new Error(`zone_pairs update: ${error.message}`)
        if (pos < QUALIFIERS_PER_ZONE) {
          qualifiers.push({ pairId: r.pairId, position: pos + 1, points: r.points })
        }
      }
    }
    console.log(
      `  ✓ ${zone.name}: ${zonePairs.length} parejas, ${matchRows.length} partidos` +
        (FULL ? ' jugados' : ' (sin resultado)')
    )
  }

  if (!FULL) {
    summary(tournament, false)
    return
  }

  // 6) Bracket (sólo --full) ------------------------------------------------
  qualifiers.sort(
    (a, b) => a.position - b.position || b.points - a.points || a.pairId.localeCompare(b.pairId)
  )
  const q = qualifiers.map((x) => x.pairId)
  let n = 1
  while (n < q.length) n *= 2
  const rounds = Math.log2(n)
  const order = seedOrder(n)
  if (q.length !== n) {
    console.log(
      `  ⚠ ${q.length} clasificados no es potencia de 2: habría byes. Usá zonas/clasificados que den 4/8/16.`
    )
  }

  const bracketRows = []
  for (let r = 1; r <= rounds; r++) {
    const count = n / 2 ** r
    for (let s = 1; s <= count; s++) {
      bracketRows.push({
        tournament_id: tournament.id,
        phase: 'bracket',
        round: r,
        bracket_round: r,
        bracket_slot: s,
        court_id: r === 1 ? courtId() : null,
      })
    }
  }
  const bracketMatches = await insert('matches', bracketRows)
  const bm = new Map()
  for (const m of bracketMatches) bm.set(`${m.bracket_round}:${m.bracket_slot}`, m)

  for (const m of bracketMatches) {
    if (m.bracket_round >= rounds) continue
    const nextSlot = Math.ceil(m.bracket_slot / 2)
    const next = bm.get(`${m.bracket_round + 1}:${nextSlot}`)
    await supabase
      .from('matches')
      .update({
        next_match_id: next.id,
        next_slot: m.bracket_slot % 2 === 1 ? 'team1' : 'team2',
      })
      .eq('id', m.id)
  }

  for (let s = 1; s <= n / 2; s++) {
    const t1 = order[2 * s - 2] <= q.length ? q[order[2 * s - 2] - 1] : null
    const t2 = order[2 * s - 1] <= q.length ? q[order[2 * s - 1] - 1] : null
    const m = bm.get(`1:${s}`)
    await supabase
      .from('matches')
      .update({ team1_pair_id: t1, team2_pair_id: t2 })
      .eq('id', m.id)
    m.team1_pair_id = t1
    m.team2_pair_id = t2
  }

  for (let r = 1; r <= rounds; r++) {
    const count = n / 2 ** r
    for (let s = 1; s <= count; s++) {
      const m = bm.get(`${r}:${s}`)
      if (!m.team1_pair_id || !m.team2_pair_id) continue
      const [w, l] = gameScore()
      const t1wins = Math.random() < 0.5
      const winner = t1wins ? m.team1_pair_id : m.team2_pair_id
      await supabase
        .from('matches')
        .update({
          team1_score: t1wins ? w : l,
          team2_score: t1wins ? l : w,
          winner_pair_id: winner,
          status: 'finished',
        })
        .eq('id', m.id)
      if (r < rounds) {
        const nextSlot = Math.ceil(s / 2)
        const next = bm.get(`${r + 1}:${nextSlot}`)
        const slot = s % 2 === 1 ? 'team1_pair_id' : 'team2_pair_id'
        await supabase.from('matches').update({ [slot]: winner }).eq('id', next.id)
        next[slot] = winner
      }
    }
  }

  await supabase
    .from('tournaments')
    .update({ bracket_published: true })
    .eq('id', tournament.id)
  console.log(`  ✓ Bracket: ${rounds} rondas, ${bracketMatches.length} partidos, jugado al campeón`)

  summary(tournament, true)
}

function summary(tournament, full) {
  const base = `/t/${tournament.id}`
  console.log('\n✓ Listo.')
  console.log(`   Gestión (logueado): /tournaments/${tournament.id}`)
  console.log(`   Zonas (gestión)   : /tournaments/${tournament.id}/zones`)
  if (full) {
    console.log('\n   Vistas públicas:')
    console.log(`   Torneo : ${base}`)
    console.log(`   Zonas  : ${base}/zones`)
    console.log(`   Llaves : ${base}/bracket`)
  } else {
    console.log('   (zonas sin publicar: se ven desde la gestión del organizador)')
  }
  console.log('')
}

main().catch((err) => {
  console.error('\n✖ Error:', err.message)
  process.exit(1)
})
