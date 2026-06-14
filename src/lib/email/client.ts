/**
 * Instancia única de Resend (server-only).
 *
 * `RESEND_API_KEY` nunca llega al navegador. Si falta, la instancia es `null`
 * y `sendEmail` lo trata como "no enviar" sin romper el flujo de negocio.
 *
 * Uso EXCLUSIVO server-side. NUNCA importar desde Client Components.
 */
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

/** Remitente por defecto (ej. `Matchpoint <noreply@tudominio>`). */
export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Matchpoint <onboarding@resend.dev>'
