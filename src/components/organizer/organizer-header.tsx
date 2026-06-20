'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border">
      <div className="flex items-center gap-8">
        <Link
          href="/dashboard"
          className="font-display text-lg tracking-tight text-foreground"
        >
          Match<span className="text-volt">point</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
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

      <div className="flex items-center gap-3">
        {establishmentName && (
          <span className="hidden text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
            {establishmentName}
          </span>
        )}
        <span
          className="grid size-8 place-items-center rounded-full bg-[color:var(--volt-tint)] text-xs font-bold text-[color:var(--volt-deep)]"
          aria-hidden
          title={establishmentName ?? undefined}
        >
          {initialsOf(establishmentName)}
        </span>
        <SignOutButton />
      </div>
    </header>
  )
}
