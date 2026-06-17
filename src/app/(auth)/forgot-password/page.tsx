import Link from 'next/link'
import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { title: 'Recuperar contraseña — Matchpoint' }

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">
        Recuperar contraseña
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ingresá tu email y te enviamos un link para crear una nueva contraseña.
      </p>
      <div className="mt-7">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-volt hover:underline">
          Volver a Ingresar
        </Link>
      </p>
    </div>
  )
}
