/**
 * Admin de la plataforma (dueño): puede aprobar/rechazar cuentas de organizador.
 * Los ids autorizados vienen de ADMIN_USER_IDS (coma-separados; .env.local en dev,
 * `vars` de wrangler.jsonc en prod). Server-only: el env no es NEXT_PUBLIC.
 */
export function isPlatformAdmin(userId: string): boolean {
  return (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId)
}
