'use client'

import { useEffect, useRef } from 'react'

/**
 * Envuelve contenido (p. ej. el cuadro de llaves) y garantiza que al imprimir
 * **entre en UNA sola hoja**: mide el tamaño natural del contenido y le aplica
 * un `transform: scale()` para encajarlo en el área imprimible, eligiendo la
 * orientación (vertical / horizontal) con la que el contenido queda más grande.
 *
 * Cómo funciona: en `beforeprint` (también disparado por window.print()) resetea
 * el transform, mide `scrollWidth/Height`, calcula el factor de escala para
 * landscape y portrait, se queda con el mayor (cap 1: nunca agranda, sólo
 * achica si hay muchas llaves) e inyecta un `@page` con la orientación elegida.
 * En `afterprint` revierte todo para no afectar la vista en pantalla.
 *
 * Pensado para A4/Letter con márgenes de 10mm. Usa un factor de seguridad para
 * tolerar la diferencia A4↔Letter sin que se corte el borde.
 */

const PX_PER_MM = 96 / 25.4 // CSS px imprimen a 96px/in, independiente del DPI real
const MARGIN_MM = 10
const SAFETY = 0.95 // colchón para diferencias de tamaño de papel / redondeos

// Área imprimible de A4 (mm → px) con los márgenes de arriba.
const A4_LONG = 297 - 2 * MARGIN_MM
const A4_SHORT = 210 - 2 * MARGIN_MM
const LANDSCAPE = { w: A4_LONG * PX_PER_MM, h: A4_SHORT * PX_PER_MM }
const PORTRAIT = { w: A4_SHORT * PX_PER_MM, h: A4_LONG * PX_PER_MM }

const PAGE_STYLE_ID = 'print-fit-page'

export function PrintFit({ children }: { children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const outer = inner.parentElement

    function pageStyleEl() {
      let el = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null
      if (!el) {
        el = document.createElement('style')
        el.id = PAGE_STYLE_ID
        document.head.appendChild(el)
      }
      return el
    }

    function fit() {
      if (!inner || !outer) return
      // Medir tamaño natural: limpiar transform y restricciones de la medición previa.
      inner.style.transform = 'none'
      outer.style.width = ''
      outer.style.height = ''
      const w = inner.scrollWidth
      const h = inner.scrollHeight
      if (!w || !h) return

      const sLand = Math.min(LANDSCAPE.w / w, LANDSCAPE.h / h)
      const sPort = Math.min(PORTRAIT.w / w, PORTRAIT.h / h)
      const portrait = sPort >= sLand
      // Cap a 1: sólo achicar (nunca agrandar) y aplicar colchón de seguridad.
      const scale = Math.min(1, (portrait ? sPort : sLand) * SAFETY)

      pageStyleEl().textContent = `@page { size: ${
        portrait ? 'portrait' : 'landscape'
      }; margin: ${MARGIN_MM}mm; }`

      inner.style.transformOrigin = 'top left'
      inner.style.transform = `scale(${scale})`
      // Colapsar el contenedor al alto/ancho ya escalado: evita páginas en blanco.
      outer.style.width = `${w * scale}px`
      outer.style.height = `${h * scale}px`
    }

    function reset() {
      if (!inner || !outer) return
      inner.style.transform = ''
      inner.style.transformOrigin = ''
      outer.style.width = ''
      outer.style.height = ''
      const el = document.getElementById(PAGE_STYLE_ID)
      if (el) el.textContent = ''
    }

    window.addEventListener('beforeprint', fit)
    window.addEventListener('afterprint', reset)
    // Fallback para navegadores que no disparan before/afterprint de forma fiable.
    const mq = window.matchMedia('print')
    const onChange = (e: MediaQueryListEvent) => (e.matches ? fit() : reset())
    mq.addEventListener?.('change', onChange)

    return () => {
      window.removeEventListener('beforeprint', fit)
      window.removeEventListener('afterprint', reset)
      mq.removeEventListener?.('change', onChange)
      reset()
    }
  }, [])

  return (
    <div className="print-fit-outer">
      <div ref={innerRef} className="print-fit-inner">
        {children}
      </div>
    </div>
  )
}
