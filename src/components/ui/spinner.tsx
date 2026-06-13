import { cn } from '@/lib/utils'

/** Spinner circular. Hereda el color del texto (`currentColor`). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  )
}
