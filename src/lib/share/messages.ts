/**
 * Mensajes de compartir client-safe (sin dependencias server).
 *
 * Espejan el copy de los emails (`src/lib/email/templates.ts`) en texto plano para
 * los enlaces `wa.me`, de modo que email y WhatsApp digan lo mismo. Se importan
 * tanto desde Client Components (botón de WhatsApp) como desde Server Actions.
 */

/** Aviso de inscripción aceptada + pendiente de seña. Sutil, sin monto ni datos de pago. */
export function depositWhatsappText(input: {
  playerName: string
  tournamentName: string
  trackUrl: string
}): string {
  const { playerName, tournamentName, trackUrl } = input
  return (
    `¡Hola ${playerName}! Tu inscripción al torneo "${tournamentName}" quedó aceptada y ` +
    `pendiente de seña. Coordinamos el pago por acá para confirmar tu lugar. ` +
    `Podés ver el estado de tu inscripción en: ${trackUrl}`
  )
}

/**
 * Normaliza un teléfono de texto libre a solo dígitos para `wa.me/<numero>`.
 * Devuelve `null` si no queda ningún dígito (número vacío o inválido) → el llamador
 * abre WhatsApp sin destinatario y el organizer elige el chat manualmente.
 */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length > 0 ? digits : null
}
