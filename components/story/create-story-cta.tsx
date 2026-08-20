'use client'

import Link from 'next/link'

type Props = {
  synthesisId: string
  variant?: 'inline' | 'card'
}

export function CreateStoryCta({ synthesisId, variant = 'inline' }: Props) {
  if (variant === 'card') {
    return (
      <section className="border-b border-line py-8 md:py-10">
        <span className="mono-label text-[10px] text-ink-soft">TURN THIS INTO A STORY</span>
        <p className="mt-3 max-w-xl font-serif text-xl leading-relaxed md:text-2xl">
          Create from this synthesis
        </p>
        <p className="mt-2 max-w-lg font-serif text-base text-ink-soft">
          A short built from the moments that shaped this insight — not a highlight reel.
        </p>
        <Link
          href={`/story/${synthesisId}`}
          className="mono-label mt-6 inline-block bg-ink px-6 py-3 text-[11px] text-background hover:opacity-90"
        >
          CREATE SHORT →
        </Link>
      </section>
    )
  }

  return (
    <Link
      href={`/story/${synthesisId}`}
      className="mono-label border border-line px-4 py-2 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background"
    >
      Create short →
    </Link>
  )
}
