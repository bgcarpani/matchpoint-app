'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { courtSchema } from '@/lib/validation/court'
import { COURT_TYPES, COURT_TYPE_LABELS } from '@/lib/domain/court'
import { createCourt, updateCourt } from '@/app/courts/actions'
import { TextField } from '@/components/form/text-field'
import { Segmented } from '@/components/form/segmented'
import { Button } from '@/components/ui/button'
import type { Court, CourtType } from '@/lib/types/database'

const TYPE_OPTIONS = COURT_TYPES.map((t) => ({
  value: t,
  label: COURT_TYPE_LABELS[t],
}))

// El nombre se valida con RHF; el tipo es un toggle (siempre válido) manejado
// con estado local — evita watch/setValue, incompatibles con el React Compiler.
const nameSchema = courtSchema.pick({ name: true })
type NameInput = { name: string }

interface Props {
  /** Si viene, el form edita esa cancha; si no, crea una nueva. */
  court?: Court
  onDone?: () => void
  onCancel?: () => void
}

export function CourtForm({ court, onDone, onCancel }: Props) {
  const router = useRouter()
  const isEdit = Boolean(court)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: court?.name ?? '' },
  })
  const [type, setType] = useState<CourtType>(court?.type ?? 'indoor')
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit({ name }: NameInput) {
    setServerError(null)
    startTransition(async () => {
      const payload = { name, type }
      const res = isEdit
        ? await updateCourt(court!.id, payload)
        : await createCourt(payload)
      if ('error' in res) {
        setServerError(res.error)
        return
      }
      if (!isEdit) {
        reset({ name: '' })
        setType('indoor')
      }
      router.refresh()
      onDone?.()
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      noValidate
    >
      <TextField
        label="Nombre"
        placeholder='Ej. "Cancha 1"'
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tipo
        </span>
        <div className="mt-1.5">
          <Segmented value={type} onChange={setType} options={TYPE_OPTIONS} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} size="lg" className="h-12">
          {pending ? 'Guardando…' : isEdit ? 'Guardar' : 'Agregar'}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-12"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-3">
          {serverError}
        </p>
      )}
    </form>
  )
}
