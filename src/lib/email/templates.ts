/**
 * Plantillas de email transaccional (es-AR), HTML con estilos inline.
 *
 * Sin `react-email` para no sumar dependencias. Cada función devuelve
 * `{ subject, html }` listo para `sendEmail`. Layout común con branding de
 * MatchUp (tema azul noche + acento volt), pensado para clientes de correo
 * (estilos inline, tabla-friendly, sin CSS externo).
 */

// Paleta alineada con globals.css.
const C = {
  bg: '#0b1220',
  card: '#131c30',
  ink: '#ecf0f7',
  muted: '#9aa6bd',
  volt: '#3b82f6',
  voltInk: '#ffffff',
  border: 'rgba(234,238,245,0.12)',
}

/** Escapa texto interpolado en el HTML para evitar romper el markup. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface LayoutInput {
  title: string
  /** Cuerpo HTML ya escapado/seguro. */
  body: string
  /** Texto y URL del botón principal (opcional). */
  cta?: { label: string; url: string }
}

function layout({ title, body, cta }: LayoutInput): string {
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
         <tr>
           <td style="border-radius:8px;background:${C.volt};">
             <a href="${esc(cta.url)}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${C.voltInk};text-decoration:none;border-radius:8px;">${esc(cta.label)}</a>
           </td>
         </tr>
       </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid ${C.border};">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:${C.ink};letter-spacing:-0.02em;">Match<span style="color:${C.volt};">Up</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:${C.ink};">
              ${body}
              ${button}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 26px;border-top:1px solid ${C.border};font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${C.muted};">
              Este es un correo automático de MatchUp. No respondas a este mensaje.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const p = (text: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.ink};">${text}</p>`
const muted = (text: string) =>
  `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:${C.muted};">${text}</p>`

export interface EmailContent {
  subject: string
  html: string
}

/** Inscripción recibida y pendiente de revisión. */
export function pendingEmail(input: {
  playerName: string
  tournamentName: string
  trackUrl: string
}): EmailContent {
  const name = esc(input.playerName)
  const tournament = esc(input.tournamentName)
  return {
    subject: `Recibimos tu inscripción a ${input.tournamentName}`,
    html: layout({
      title: 'Inscripción pendiente',
      body:
        p(`¡Hola ${name}!`) +
        p(
          `Recibimos tu solicitud de inscripción al torneo <strong>${tournament}</strong>. Tu pareja quedó <strong>pendiente de aprobación</strong> por el organizador.`
        ) +
        muted(
          'Te avisaremos por este medio cuando el organizador acepte o rechace tu inscripción. Mientras tanto, podés ver el estado desde el siguiente enlace.'
        ),
      cta: { label: 'Ver estado de mi inscripción', url: input.trackUrl },
    }),
  }
}

/**
 * Inscripción aceptada + pendiente de seña. Desde el Slice 6 (seña) este mail pasa
 * de envío automático a manual (lo dispara el organizer con un botón), para poder
 * no avisar si la seña ya fue pagada. Copy sutil: menciona la seña pero sin monto
 * ni datos de pago (eso lo coordina el organizer en la conversación).
 */
export function acceptedEmail(input: {
  playerName: string
  tournamentName: string
  trackUrl: string
}): EmailContent {
  const name = esc(input.playerName)
  const tournament = esc(input.tournamentName)
  return {
    subject: `¡Tu inscripción a ${input.tournamentName} fue aceptada!`,
    html: layout({
      title: 'Inscripción aceptada',
      body:
        p(`¡Hola ${name}!`) +
        p(
          `Buenas noticias: tu inscripción al torneo <strong>${tournament}</strong> fue <strong>aceptada</strong>. 🎾`
        ) +
        p(
          `Quedó <strong>pendiente de seña</strong>: coordinamos el pago para confirmar tu lugar.`
        ) +
        muted(
          'El organizador se va a contactar para coordinar la seña. Próximamente vas a recibir más información (zona, horarios y partidos). Podés seguir el estado de tu inscripción desde el siguiente enlace.'
        ),
      cta: { label: 'Ver mi inscripción', url: input.trackUrl },
    }),
  }
}

/** Inscripción rechazada por el organizador. */
export function rejectedEmail(input: {
  playerName: string
  tournamentName: string
  trackUrl: string
}): EmailContent {
  const name = esc(input.playerName)
  const tournament = esc(input.tournamentName)
  return {
    subject: `Novedades sobre tu inscripción a ${input.tournamentName}`,
    html: layout({
      title: 'Inscripción rechazada',
      body:
        p(`Hola ${name},`) +
        p(
          `Lamentamos informarte que tu inscripción al torneo <strong>${tournament}</strong> fue <strong>rechazada</strong> por el organizador.`
        ) +
        muted(
          'Si creés que se trata de un error, comunicate con el organizador. Podés ver el detalle de tu inscripción desde el siguiente enlace.'
        ),
      cta: { label: 'Ver mi inscripción', url: input.trackUrl },
    }),
  }
}
