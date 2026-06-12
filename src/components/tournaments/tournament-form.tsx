'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  tournamentFormSchema,
  type TournamentFormFields,
} from '@/lib/validation/tournament'
import { isValidCategoryValue } from '@/lib/domain/tournament'
import { toDateTimeLocalValue } from '@/lib/format'
import {
  createTournament,
  updateTournament,
  type TournamentPayload,
} from '@/app/tournaments/actions'
import { TextField } from '@/components/form/text-field'
import {
  CategorySelector,
  type CategoryState,
} from '@/components/tournaments/category-selector'
import { Button } from '@/components/ui/button'
import type { Tournament } from '@/lib/types/database'

export function TournamentForm({ tournament }: { tournament?: Tournament }) {
  const isEdit = Boolean(tournament)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TournamentFormFields>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      name: tournament?.name ?? '',
      tournament_date: tournament?.tournament_date ?? '',
      registration_opens_at: tournament?.registration_opens_at
        ? toDateTimeLocalValue(tournament.registration_opens_at)
        : '',
      max_pairs: tournament ? String(tournament.max_pairs) : '',
      max_pair_requests: tournament ? String(tournament.max_pair_requests) : '',
    },
  })

  const [category, setCategory] = useState<CategoryState>({
    category_type: tournament?.category_type ?? 'individual',
    category_value: tournament?.category_value ?? '1ra',
    gender: tournament?.gender ?? 'male',
  })
  const [categoryError, setCategoryError] = useState<string | undefined>()
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(fields: TournamentFormFields) {
    if (
      !isValidCategoryValue(category.category_type, category.category_value)
    ) {
      setCategoryError('Completá una categoría válida.')
      return
    }
    setCategoryError(undefined)
    setServerError(null)

    const payload: TournamentPayload = { ...fields, ...category }
    startTransition(async () => {
      const res = isEdit
        ? await updateTournament(tournament!.id, payload)
        : await createTournament(payload)
      if (res && 'error' in res) setServerError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      <TextField
        label="Nombre del torneo"
        placeholder='Ej. "Torneo Apertura 2026"'
        error={errors.name?.message}
        {...register('name')}
      />

      <CategorySelector
        value={category}
        onChange={setCategory}
        error={categoryError}
      />

      <TextField
        label="Fecha del torneo"
        type="date"
        error={errors.tournament_date?.message}
        {...register('tournament_date')}
      />

      <div>
        <TextField
          label="Apertura de inscripción (opcional)"
          type="datetime-local"
          error={errors.registration_opens_at?.message}
          {...register('registration_opens_at')}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Dejalo vacío para abrir la inscripción manualmente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Cupos del torneo"
          type="number"
          inputMode="numeric"
          placeholder="16"
          error={errors.max_pairs?.message}
          {...register('max_pairs')}
        />
        <TextField
          label="Cupos de solicitud"
          type="number"
          inputMode="numeric"
          placeholder="24"
          error={errors.max_pair_requests?.message}
          {...register('max_pair_requests')}
        />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Las solicitudes (lista de espera) deben ser mayores o iguales a los
        cupos del torneo. Ambos en parejas.
      </p>

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
        {pending
          ? 'Guardando…'
          : isEdit
            ? 'Guardar cambios'
            : 'Crear torneo'}
      </Button>
    </form>
  )
}
