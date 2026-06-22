import { themeCss } from '@/lib/branding/themes'

/**
 * Inyecta la paleta de marca del organizador como variables CSS en `:root`,
 * tiñendo el documento entero (header, contenido y el halo `.glow` del body).
 * Se renderiza después de globals.css → gana la cascada. Componente compartido:
 * lo usan el área organizer (vía OrganizerHeader) y las páginas públicas.
 * Ver spec-v3-2.md A.4.
 */
export function ThemeStyle({ themeKey }: { themeKey: string | null | undefined }) {
  return <style dangerouslySetInnerHTML={{ __html: themeCss(themeKey) }} />
}
