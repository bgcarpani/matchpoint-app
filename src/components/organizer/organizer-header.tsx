'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Torneos' },
  { href: '/courts', label: 'Canchas' },
]

/** Iniciales del establecimiento para el avatar (máx. 2 letras). */
function initialsOf(name?: string | null): string {
  if (!name) return '·'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '·'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export function OrganizerHeader({
  establishmentName,
}: {
  establishmentName?: string | null
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="relative flex items-center justify-between gap-3 border-b border-border">
      {/* Izquierda: logo + nav (la nav inline sólo desde sm). */}
      <div className="flex min-w-0 items-center gap-4 sm:gap-8">
        <Link
          href="/dashboard"
          className="font-display shrink-0 text-lg tracking-tight text-foreground"
        >
          Match<span className="text-volt">point</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-1 py-4 text-sm font-semibold transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-volt"
                    aria-hidden
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Derecha (desktop): nombre + avatar + cerrar sesión. */}
      <div className="hidden shrink-0 items-center gap-2 sm:flex sm:gap-3">
        {establishmentName && (
          <span className="hidden text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
            {establishmentName}
          </span>
        )}
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--volt-tint)] text-xs font-bold text-[color:var(--volt-deep)]"
          aria-hidden
          title={establishmentName ?? undefined}
        >
          {initialsOf(establishmentName)}
        </span>
        <SignOutButton />
      </div>

      {/* Mobile: botón hamburguesa. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-foreground sm:hidden"
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Menu className="size-5" aria-hidden />
        )}
      </button>

      {/* Mobile: panel desplegable. */}
      {open && (
        <>
          {/* Backdrop para cerrar tocando afuera. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default sm:hidden"
          />
          <div className="elevate-lg absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card sm:hidden">
            {establishmentName && (
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--volt-tint)] text-xs font-bold text-[color:var(--volt-deep)]"
                  aria-hidden
                >
                  {initialsOf(establishmentName)}
                </span>
                <span className="min-w-0 truncate text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {establishmentName}
                </span>
              </div>
            )}
            <nav className="p-1">
              {NAV.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-border p-1">
              <MobileSignOut />
            </div>
          </div>
        </>
      )}
    </header>
  )
}

/** Ítem "Cerrar sesión" del menú mobile (misma action que el botón de desktop). */
function MobileSignOut() {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {pending ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  )
}
