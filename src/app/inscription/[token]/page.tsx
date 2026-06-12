import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getInscriptionByToken } from '@/lib/public/inscription'
import { InscriptionStatusCard } from '@/components/public/inscription-status-card'

export const metadata: Metadata = { title: 'Estado de inscripción — Matchpoint' }

export default async function InscriptionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getInscriptionByToken(token)
  if (!data) notFound()

  return (
    <main className="relative z-[2] mx-auto w-full max-w-xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </Link>
      </header>

      <div className="mt-4">
        <InscriptionStatusCard data={data} />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Guardá este enlace privado para volver a consultar el estado sin
        necesidad de cuenta.
      </p>
    </main>
  )
}
