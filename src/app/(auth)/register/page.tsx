import Link from 'next/link'
import type { Metadata } from 'next'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Crear cuenta — Matchpoint' }

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Crear cuenta</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Registrá tu establecimiento para empezar a organizar torneos.
      </p>
      <div className="mt-7">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-medium text-volt hover:underline">
          Ingresar
        </Link>
      </p>
    </div>
  )
}
