'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/lib/validation/auth'
import { registerOrganizer } from '../actions'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(values: RegisterInput) {
    setServerError(null)
    startTransition(async () => {
      const res = await registerOrganizer(values)
      if ('error' in res) setServerError(res.error)
      else setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-volt/30 bg-volt/5 px-4 py-5 text-sm">
        <p className="font-display text-base text-foreground">
          Tu solicitud quedó registrada
        </p>
        <p className="mt-2 text-muted-foreground">
          Te enviamos un link para confirmar tu email — abrilo para validar tu
          casilla. Las cuentas nuevas se revisan de forma manual: te avisamos
          cuando aprobemos la tuya.
        </p>
        <p className="mt-2 text-muted-foreground">
          ¿No te llegó el mail? Revisá spam o esperá unos minutos.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <TextField
        label="Nombre completo"
        autoComplete="name"
        error={errors.full_name?.message}
        {...register('full_name')}
      />
      <TextField
        label="Nombre del establecimiento"
        autoComplete="organization"
        error={errors.establishment_name?.message}
        {...register('establishment_name')}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Repetir"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
      </div>

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
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  )
}
