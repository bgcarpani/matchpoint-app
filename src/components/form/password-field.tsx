'use client'

import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  error?: string
}

/**
 * Input de contraseña con botón "mostrar/ocultar" (ojito). Misma estética que
 * TextField; compatible con react-hook-form (forwardRef + spread de register()).
 */
export const PasswordField = forwardRef<HTMLInputElement, Props>(
  function PasswordField({ label, error, className, ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="relative mt-1.5">
          <input
            ref={ref}
            {...props}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors',
              error
                ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/40'
                : 'border-input focus:border-volt focus:ring-1 focus:ring-volt',
              className
            )}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            {visible ? (
              <EyeOff className="size-4.5" aria-hidden />
            ) : (
              <Eye className="size-4.5" aria-hidden />
            )}
          </button>
        </div>
        {error && (
          <span className="mt-1 block text-xs text-destructive">{error}</span>
        )}
      </label>
    )
  }
)
