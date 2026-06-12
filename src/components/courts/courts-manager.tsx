'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CourtForm } from './court-form'
import { deleteCourt } from '@/app/courts/actions'
import { COURT_TYPE_LABELS } from '@/lib/domain/court'
import { Button } from '@/components/ui/button'
import type { Court } from '@/lib/types/database'

export function CourtsManager({ courts }: { courts: Court[] }) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="grid gap-8">
      {/* Alta */}
      <section className="rounded-2xl border border-border bg-card/40 p-6 sm:p-7">
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Agregar cancha
        </h2>
        <div className="mt-5">
          <CourtForm />
        </div>
      </section>

      {/* Listado */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Tus canchas
          <span className="ml-2 text-muted-foreground/60 tnum">
            {courts.length}
          </span>
        </h2>

        {courts.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
            Todavía no agregaste canchas.
          </div>
        ) : (
          <ul className="mt-5 grid gap-3">
            {courts.map((court) =>
              editingId === court.id ? (
                <li
                  key={court.id}
                  className="rounded-xl border border-volt/30 bg-card/40 p-5"
                >
                  <CourtForm
                    court={court}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <CourtRow
                  key={court.id}
                  court={court}
                  onEdit={() => setEditingId(court.id)}
                />
              )
            )}
          </ul>
        )}
      </section>
    </div>
  )
}

function CourtRow({ court, onEdit }: { court: Court; onEdit: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onDelete() {
    if (!confirm(`¿Eliminar "${court.name}"?`)) return
    startTransition(async () => {
      const res = await deleteCourt(court.id)
      if ('error' in res) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/40 px-5 py-4">
      <div className="flex items-center gap-3">
        <span
          className={`size-2 rounded-full ${
            court.type === 'indoor' ? 'bg-volt' : 'bg-muted-foreground'
          }`}
          aria-hidden
        />
        <span className="font-medium text-foreground">{court.name}</span>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {COURT_TYPE_LABELS[court.type]}
        </span>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Editar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={onDelete}
        >
          {pending ? '…' : 'Eliminar'}
        </Button>
      </div>
    </li>
  )
}
