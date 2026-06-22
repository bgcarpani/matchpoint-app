/**
 * Logo del organizador en Supabase Storage (bucket público `org-logos`).
 * Convención de path: `{organizer_id}/logo` (sin extensión: se sube con upsert y
 * el content-type va en la metadata, así reemplazar pisa el mismo objeto y no
 * deja huérfanos). Ver spec-v3-2.md A.2.
 */
export const ORG_LOGOS_BUCKET = 'org-logos'

/** Path canónico del logo de un organizador. */
export function logoPath(organizerId: string): string {
  return `${organizerId}/logo`
}

/**
 * URL pública del logo a partir del `logo_path` guardado. Pura (no necesita
 * cliente Supabase): arma la URL del CDN de Storage desde el env público.
 * Sirve igual en server y browser.
 */
export function logoPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${ORG_LOGOS_BUCKET}/${path}`
}
