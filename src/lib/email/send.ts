/**
 * Wrapper de envío resiliente.
 *
 * REGLA DE ORO: un fallo de email nunca debe romper la acción de negocio que lo
 * dispara (inscripción, accept/reject). Por eso `sendEmail` no lanza: envuelve
 * todo en try/catch, loguea y devuelve `{ ok: boolean }`.
 */
import { resend, EMAIL_FROM } from './client'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailInput): Promise<{ ok: boolean }> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY ausente — se omite el envío a', to)
    return { ok: false }
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[email] Resend devolvió error:', error)
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email] Falló el envío:', err)
    return { ok: false }
  }
}
