import type { Metadata } from 'next'
import { UpdatePasswordForm } from './update-password-form'

export const metadata: Metadata = { title: 'Nueva contraseña — Matchpoint' }

export default function UpdatePasswordPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Nueva contraseña</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Elegí una contraseña nueva para tu cuenta.
      </p>
      <div className="mt-7">
        <UpdatePasswordForm />
      </div>
    </div>
  )
}
