import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative z-[2] flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <Link
        href="/"
        className="font-display mb-8 text-2xl text-foreground transition-opacity hover:opacity-80"
      >
        Match<span className="text-volt">point</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/50 p-7 sm:p-9">
        {children}
      </div>
    </div>
  )
}
