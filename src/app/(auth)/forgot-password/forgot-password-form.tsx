'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@/lib/validation/auth'
import { requestPasswordReset } from '../actions'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(values: ForgotPasswordInput) {
    setServerError(null)
    startTransition(async () => {
      const res = await requestPasswordReset(values)
      if ('error' in res) setServerError(res.error)
      else setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-volt/30 bg-volt/5 px-4 py-5 text-sm">
        <p className="font-display text-base text-foreground">
          Revisá tu email
        </p>
        <p className="mt-2 text-muted-foreground">
          Si hay una cuenta con ese email, te enviamos un link para crear una
          nueva contraseña. Abrilo desde este dispositivo.
        </p>
        <p className="mt-2 text-muted-foreground">
          ¿No te llegó? Revisá spam o esperá unos minutos.
        </p>
      </div>
    )
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
        {pending ? 'Enviando…' : 'Enviar link'}
      </Button>
    </form>
  )
}
