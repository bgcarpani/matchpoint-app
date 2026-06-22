/**
 * Template raíz: a diferencia de `layout.tsx`, se re-monta en cada navegación,
 * así que su animación de entrada (`.page-enter`, ver globals.css) se vuelve a
 * disparar en cada cambio de ruta → da una transición sutil de fade + leve subida.
 *
 * Es CSS puro (sin JS), por eso puede ser server component. El fade respeta
 * `prefers-reduced-motion`. Ver spec-v3-2.md Feature D. (View Transitions API
 * queda como posible upgrade futuro cuando estabilice con OpenNext/Cloudflare.)
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
