'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

/**
 * Input de texto compatible con react-hook-form (forwardRef + spread de register()).
 * Estética Volt Court. Reutilizable por todos los formularios.
 */
export const TextField = forwardRef<HTMLInputElement, Props>(
  function TextField({ label, error, className, ...props }, ref) {
    return (
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <input
          ref={ref}
          {...props}
          aria-invalid={error ? true : undefined}
          className={cn(
            'mt-1.5 w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors',
            error
              ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/40'
              : 'border-input focus:border-volt focus:ring-1 focus:ring-volt',
            className
          )}
        />
        {error && (
          <span className="mt-1 block text-xs text-destructive">{error}</span>
        )}
      </label>
    )
  }
)
