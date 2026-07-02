'use client'

import { useState } from 'react'

/**
 * Botones de compartir reutilizables. La URL absoluta se arma server-side
 * (headers / getBaseUrl) y se pasa ya resuelta, para que funcione igual en
 * local y producción sin depender de `window`.
 *
 * - WhatsApp: click-to-chat (`https://wa.me/?text=…`), sin API ni costo.
 * - Instagram (historia): Instagram no admite subir una historia ni agregarle un
 *   *link sticker* desde la web (eso requiere la app nativa + Sharing SDK). Lo que
 *   sí podemos: generar la imagen (`storyUrl` → `/og/story`) y compartirla con
 *   `navigator.share({ files })` (mobile) o descargarla (desktop). Para que la
 *   historia quede clickeable, además **copiamos la URL al portapapeles** y guiamos
 *   a la persona a pegarla en el sticker de Enlace de Instagram (un solo pegar).
 */
export function ShareButtons({
  url,
  text,
  storyUrl,
}: {
  url: string
  text: string
  /** Ruta `/og/story` que genera la imagen 1080×1920 (habilita el botón IG). */
  storyUrl?: string
}) {
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`

  async function shareStory() {
    if (!storyUrl || busy) return
    setBusy(true)
    try {
      // Copiamos el link primero: cuando la persona agregue el sticker de Enlace
      // en Instagram, ya lo tiene en el portapapeles para pegar.
      let copied = false
      try {
        await navigator.clipboard?.writeText(url)
        copied = true
      } catch {
        // Sin permiso de clipboard: la URL igual va impresa en la imagen.
      }

      const res = await fetch(storyUrl)
      const blob = await res.blob()
      const file = new File([blob], 'matchup-historia.png', {
        type: blob.type || 'image/png',
      })

      // Web Share Level 2 (mobile): abre el share sheet con la imagen lista.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text })
      } else {
        // Fallback (desktop / no soportado): descargar + abrir Instagram.
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = 'matchup-historia.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(href)
        window.open('https://www.instagram.com/', '_blank', 'noopener')
      }

      setHint(
        copied
          ? 'Link copiado. En Instagram: subí la historia → sticker de Enlace → pegar.'
          : 'En Instagram: subí la historia → sticker de Enlace → pegá el link del torneo.'
      )
    } catch {
      // Último recurso: abrir la imagen en otra pestaña para guardarla a mano.
      window.open(storyUrl, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#25D366]/20"
      >
        <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
        Compartir por WhatsApp
      </a>

      {storyUrl && (
        <button
          type="button"
          onClick={shareStory}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1306C]/40 bg-[#E1306C]/10 px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#E1306C]/20 disabled:opacity-60"
        >
          <InstagramIcon className="h-4 w-4 text-[#E1306C]" />
          {busy ? 'Generando…' : 'Compartir en historia'}
        </button>
      )}

      {hint && (
        <p className="basis-full text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
