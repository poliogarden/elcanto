import Link from 'next/link'
import { AsterismMark } from '@/components/brand/asterism-mark'
import { HomePageShell } from '@/components/home/home-page-shell'

export function HomeInsightPreview() {
  return (
    <section className="border-b border-line py-8 md:py-10">
      <HomePageShell>
        <span className="mono-label text-[10px] text-ink-soft">WHAT ELCANTO FINDS</span>

        <div className="mt-6 flex flex-col items-center gap-6 md:mt-8">
          <div className="grid w-full max-w-lg grid-cols-3 gap-3 text-center">
            {['VIDEO A', 'VIDEO B', 'VIDEO C'].map((label) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-background">
                  <span className="h-2 w-2 rounded-full bg-ink" aria-hidden />
                </span>
                <span className="mono text-[9px] text-ink-soft">{label}</span>
              </div>
            ))}
          </div>

          <div className="relative flex w-full max-w-md flex-col items-center">
            <div className="absolute top-0 h-8 w-px bg-line" aria-hidden />
            <div className="mt-6 flex items-center gap-2">
              <span className="h-px w-12 bg-line md:w-20" aria-hidden />
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-mint bg-mint/15">
                <AsterismMark size={18} className="text-mint-ink" />
              </span>
              <span className="h-px w-12 bg-line md:w-20" aria-hidden />
            </div>
            <span className="mono-label mt-3 text-[10px] text-mint-ink">INSIGHT</span>
          </div>
        </div>

        <blockquote className="mx-auto mt-6 max-w-md text-center font-serif text-lg leading-relaxed text-ink-soft md:text-xl">
          &ldquo;Something none of the videos says alone.&rdquo;
        </blockquote>

        <div className="mt-6 text-center">
          <Link
            href="/about"
            className="mono-label inline-flex border border-line px-4 py-2.5 text-[10px] hover:bg-ink hover:text-background"
          >
            SEE AN EXAMPLE →
          </Link>
        </div>
      </HomePageShell>
    </section>
  )
}
