import Link from 'next/link'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Ingresar — MatchUp' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">Ingresar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Accedé al panel para gestionar tus torneos y canchas.
      </p>
      <div className="mt-7">
        <LoginForm authError={error === 'auth'} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{' '}
        <Link href="/register" className="font-medium text-volt hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}
