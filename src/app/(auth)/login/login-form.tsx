'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validation/auth'
import { loginOrganizer } from '../actions'
import { TextField } from '@/components/form/text-field'
import { PasswordField } from '@/components/form/password-field'
import { Button } from '@/components/ui/button'

export function LoginForm({ authError = false }: { authError?: boolean }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const [serverError, setServerError] = useState<string | null>(
    authError ? 'El link no es válido o expiró. Probá de nuevo.' : null
  )
  const [pending, startTransition] = useTransition()

  function onSubmit(values: LoginInput) {
    setServerError(null)
    startTransition(async () => {
      const res = await loginOrganizer(values)
      if (res?.error) setServerError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Contraseña"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Link
        href="/forgot-password"
        className="-mt-1 justify-self-end text-sm text-muted-foreground hover:text-volt hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>

      {serverError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="font-display mt-1 h-12 text-base"
      >
        {pending ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </form>
  )
}
