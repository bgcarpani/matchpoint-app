import { ImageResponse } from 'next/og'

/**
 * apple-touch-icon (180×180) para iOS, que NO lee el manifest y exige PNG raster
 * (ignora SVG). Next auto-inyecta el `<link rel="apple-touch-icon">`. Se genera con
 * next/og (mismo enfoque que `src/lib/og/story.tsx`) para no shippear binarios.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B1220',
          color: '#3B82F6',
          fontSize: 120,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        M
      </div>
    ),
    { ...size }
  )
}
