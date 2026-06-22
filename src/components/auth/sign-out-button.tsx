'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      aria-label="Cerrar sesión"
      className="gap-2"
    >
      <LogOut className="size-4 shrink-0" aria-hidden />
      {/* En mobile queda solo el ícono; el texto aparece desde sm. */}
      <span className="hidden sm:inline">
        {pending ? 'Saliendo…' : 'Cerrar sesión'}
      </span>
    </Button>
  )
}
