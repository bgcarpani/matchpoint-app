'use client'

/**
 * Botón "Imprimir" para las vistas públicas (zonas / llaves). Dispara el diálogo
 * nativo del navegador; los estilos `@media print` en globals.css se encargan de
 * la paleta clara y de ocultar el chrome (`.no-print`). Se oculta a sí mismo al
 * imprimir vía `no-print`.
 */
export function PrintButton({ label = 'Imprimir' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
    >
      {label} ⎙
    </button>
  )
}
