'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Panel' },
  { href: '/courts', label: 'Canchas' },
]

export function OrganizerHeader({
  establishmentName,
}: {
  establishmentName?: string | null
}) {
  const pathname = usePathname()

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-display text-lg text-foreground">
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
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {establishmentName && (
          <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:inline">
            {establishmentName}
          </span>
        )}
        <SignOutButton />
      </div>
    </header>
  )
}
