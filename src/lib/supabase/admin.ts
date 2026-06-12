/**
 * Cliente Supabase con service-role — BYPASSEA RLS.
 *
 * Uso EXCLUSIVO server-side (route handlers `/api/public/*` y tareas internas):
 *   - Inscripción pública de parejas (insert players + pair)
 *   - Consulta de estado por lookup_token (sin login)
 *   - Apertura automática de inscripción (registration_opens_at)
 *
 * NUNCA importar desde Client Components ni exponer la service key al navegador.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
