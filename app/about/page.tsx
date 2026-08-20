import Link from 'next/link'
import { BrandFooter } from '@/components/brand/brand-footer'
import { HomePageShell } from '@/components/home/home-page-shell'
import { Masthead } from '@/components/masthead'

const steps = [
  ['Save', 'Drop in the YouTube videos on one topic. Each becomes a voice on the desk.'],
  ['Understand', 'elcanto reads every transcript and works out what each video is actually arguing.'],
  ['Compare', 'Voices are set against each other to find where they line up and where they clash.'],
  ['Synthesize', 'The whole set resolves into one edited research document — not ten summaries.'],
  ['Ask', 'Question the entire collection as if it were a single, well-read source.'],
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Masthead />

      <HomePageShell>
      <section className="border-b border-line py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="mono-label mb-6 text-xs text-ink-soft">About elcanto</p>
            <h1 className="font-serif text-4xl font-medium leading-[1.02] tracking-tight text-balance md:text-6xl">
              You didn&apos;t come to watch ten videos. You came for the understanding you only get
              after watching all of them.
            </h1>
          </div>
          <p className="self-end font-serif text-lg leading-relaxed text-ink-soft text-pretty lg:col-span-4">
            elcanto reads a set of YouTube videos on one question, then finds the agreement, the
            conflict, and the quiet insights — and writes them up as a single synthesis.
          </p>
        </div>
      </section>

      <section className="border-b border-line">
        {steps.map(([title, body], i) => (
          <div
            key={title}
            className="grid grid-cols-[auto_1fr] items-baseline gap-6 border-b border-line py-8 last:border-b-0 md:grid-cols-[6rem_16rem_1fr]"
          >
            <span className="mono text-sm text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
            <h2 className="font-serif text-2xl font-medium md:text-3xl">{title}</h2>
            <p className="col-span-2 font-serif text-lg leading-relaxed text-pretty md:col-span-1">
              {body}
            </p>
          </div>
        ))}
      </section>

      <section className="py-14 md:py-20">
        <p className="max-w-3xl font-serif text-2xl leading-snug text-balance md:text-4xl">
          Many voices. One understanding. Currently, elcanto reads YouTube — and only YouTube — so
          it can do that one thing well.
        </p>
        <Link
          href="/"
          className="mono-label mt-10 inline-flex border border-line px-5 py-4 text-xs text-ink transition-colors hover:bg-ink hover:text-background"
        >
          Start a synthesis {'\u2192'}
        </Link>
      </section>
      </HomePageShell>
      <BrandFooter />
    </main>
  )
}
