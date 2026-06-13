'use client'

import { DayPicker } from 'react-day-picker'
// Los estilos base de react-day-picker se importan en globals.css (antes de los
// overrides del tema) para que la cascada resuelva a favor del tema.

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Captions en español sin depender de date-fns: usamos Intl.
const formatters = {
  formatCaption: (date: Date) =>
    capitalize(
      new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        year: 'numeric',
      }).format(date)
    ),
  formatWeekdayName: (date: Date) =>
    new Intl.DateTimeFormat('es-AR', { weekday: 'narrow' })
      .format(date)
      .toUpperCase(),
}

/** Calendario de selección de un día, estilizado con los tokens del tema. */
export function Calendar({
  selected,
  onSelect,
  fromToday,
}: {
  selected?: Date
  onSelect?: (date?: Date) => void
  /** Deshabilita las fechas anteriores a hoy. */
  fromToday?: boolean
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      showOutsideDays
      weekStartsOn={1}
      formatters={formatters}
      disabled={fromToday ? { before: today } : undefined}
    />
  )
}
