'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import { settingsSchema, type SettingsInput } from '@/lib/validation/settings'
import {
  THEME_LIST,
  themeVars,
  type ThemeKey,
  DEFAULT_THEME,
} from '@/lib/branding/themes'
import { ORG_LOGOS_BUCKET, logoPath, logoPublicUrl } from '@/lib/branding/logo'
import { createClient } from '@/lib/supabase/client'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { confirmLogo, removeLogo, updateOrganizerProfile } from '@/app/settings/actions'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_BYTES = 1024 * 1024 // 1 MB

function initialsOf(name?: string | null): string {
  if (!name) return '·'
  const w = name.trim().split(/\s+/).filter(Boolean)
  if (w.length === 0) return '·'
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase()
  return (w[0][0] + w[w.length - 1][0]).toUpperCase()
}

export function SettingsForm({
  organizerId,
  establishmentName,
  initialLogoPath,
  initialAddress,
  initialMapsUrl,
  initialThemeKey,
}: {
  organizerId: string
  establishmentName: string | null
  initialLogoPath: string | null
  initialAddress: string
  initialMapsUrl: string
  initialThemeKey: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [theme, setTheme] = useState<ThemeKey>(
    THEME_LIST.some((t) => t.key === initialThemeKey)
      ? (initialThemeKey as ThemeKey)
      : DEFAULT_THEME
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(
    logoPublicUrl(initialLogoPath)
  )
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)

  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      address: initialAddress,
      maps_url: initialMapsUrl,
      theme_key: theme,
    },
  })

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-elegir el mismo archivo
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      setLogoError('Formato no soportado. Usá PNG, JPG, WEBP o SVG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setLogoError('El archivo supera 1 MB.')
      return
    }
    setLogoError(null)
    setLogoBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.storage
        .from(ORG_LOGOS_BUCKET)
        .upload(logoPath(organizerId), file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        })
      if (error) throw error
      const res = await confirmLogo()
      if ('error' in res) throw new Error(res.error)
      // Cache-bust para ver el logo nuevo al instante (misma URL, objeto pisado).
      setLogoUrl(`${logoPublicUrl(logoPath(organizerId))}?t=${Date.now()}`)
      router.refresh()
    } catch {
      setLogoError('No se pudo subir el logo. Probá de nuevo.')
    } finally {
      setLogoBusy(false)
    }
  }

  async function onRemoveLogo() {
    setLogoBusy(true)
    setLogoError(null)
    const res = await removeLogo()
    if ('error' in res) {
      setLogoError(res.error)
    } else {
      setLogoUrl(null)
      router.refresh()
    }
    setLogoBusy(false)
  }

  function onSubmit(values: SettingsInput) {
    setServerError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateOrganizerProfile({ ...values, theme_key: theme })
      if ('error' in res) {
        setServerError(res.error)
      } else {
        setSaved(true)
        router.refresh()
      }
    })
  }

  return (
    // El subárbol entero previsualiza la paleta elegida (acento, focus, swatches).
    <div className="grid gap-6" style={themeVars(theme)}>
      {/* Logo */}
      <section className="elevate rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Logo
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview del logo del CDN de Storage
            <img
              src={logoUrl}
              alt="Logo de la organización"
              className="size-20 shrink-0 rounded-2xl border border-border object-cover"
            />
          ) : (
            <span
              className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[color:var(--volt-tint)] text-xl font-bold text-[color:var(--volt-deep)]"
              aria-hidden
            >
              {initialsOf(establishmentName)}
            </span>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={logoBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
              >
                <ImagePlus className="size-4" aria-hidden />
                {logoBusy ? 'Subiendo…' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  disabled={logoBusy}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Quitar
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP o SVG. Hasta 1 MB. Cuadrado se ve mejor.
            </p>
            {logoError && (
              <p className="text-xs text-destructive">{logoError}</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED.join(',')}
            onChange={onPickLogo}
            className="hidden"
          />
        </div>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6" noValidate>
        {/* Paleta de marca */}
        <section className="elevate rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Paleta de marca
            </h2>
            {theme !== DEFAULT_THEME && (
              <button
                type="button"
                onClick={() => setTheme(DEFAULT_THEME)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Volver al default
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Tiñe tu panel y las páginas públicas que ven los jugadores.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {THEME_LIST.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setTheme(p.key)}
                aria-pressed={theme === p.key}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                  theme === p.key
                    ? 'border-volt bg-[color:var(--volt-surface)] font-semibold text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className="size-5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: p.volt }}
                  aria-hidden
                />
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Ubicación */}
        <section className="elevate grid gap-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ubicación
          </h2>
          <TextField
            label="Dirección"
            placeholder="Av. del Libertador 1234, CABA"
            error={errors.address?.message}
            {...register('address')}
          />
          <TextField
            label="Link de mapa (opcional)"
            type="url"
            placeholder="https://maps.google.com/…"
            error={errors.maps_url?.message}
            {...register('maps_url')}
          />
        </section>

        {/* Guardar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} className="font-semibold">
            {pending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
          {saved && (
            <span className="text-sm font-medium text-[color:var(--success)]">
              Guardado ✓
            </span>
          )}
          {serverError && (
            <span className="text-sm text-destructive">{serverError}</span>
          )}
        </div>
      </form>
    </div>
  )
}
