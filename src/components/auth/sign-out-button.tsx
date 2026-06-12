'use client'

import { useTransition } from 'react'
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
    >
      {pending ? 'Saliendo…' : 'Cerrar sesión'}
    </Button>
  )
}
