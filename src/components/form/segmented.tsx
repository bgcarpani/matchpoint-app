'use client'

import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

/**
 * Control segmentado (toggle de N opciones) en estética Volt Court.
 * Controlado con estado local — evita watch/setValue de RHF.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: readonly Option<T>[]
  className?: string
}) {
  return (
    <div
      role="group"
      className={cn(
        'inline-flex rounded-lg border border-input p-0.5',
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            value === o.value
              ? 'bg-volt text-volt-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
