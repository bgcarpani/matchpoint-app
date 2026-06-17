'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  updatePasswordSchema,
  type UpdatePasswordInput,
} from '@/lib/validation/auth'
import { updatePassword } from '../actions'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'

export function UpdatePasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(values: UpdatePasswordInput) {
    setServerError(null)
    startTransition(async () => {
      // En éxito la action redirige a /dashboard; solo manejamos el error.
      const res = await updatePassword(values)
      if (res?.error) setServerError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <TextField
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <TextField
        label="Repetir contraseña"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register('confirm')}
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
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  )
}
