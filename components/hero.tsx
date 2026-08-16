export function Hero() {
  return (
    <section className="border-b border-line px-5 py-12 md:px-8 md:py-16">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="mono-label mb-6 text-xs text-ink-soft">Multiple videos. One synthesis.</p>
          <h1 className="font-serif text-5xl font-medium leading-[0.98] tracking-tight text-balance md:text-7xl lg:text-8xl">
            What are they
            <br />
            <span className="italic">really</span> saying?
          </h1>
        </div>
        <div className="flex flex-col justify-end lg:col-span-4">
          <p className="border-t border-line pt-5 font-serif text-xl leading-relaxed text-pretty md:text-2xl">
            Bring the YouTube videos. We&apos;ll find where they agree, where they don&apos;t, and
            what it all means.
          </p>
        </div>
      </div>
    </section>
  )
}
