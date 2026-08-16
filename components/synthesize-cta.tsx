type SynthesizeCTAProps = {
  count: number
  totalDuration: string
  onSynthesize: () => void
}

export function SynthesizeCTA({ count, totalDuration, onSynthesize }: SynthesizeCTAProps) {
  const disabled = count < 2

  return (
    <div className="px-5 py-12 md:px-8 md:py-16">
      <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">
          {count} {count === 1 ? 'voice' : 'voices'} on the desk
        </span>
        <span className="mono-label text-xs text-ink-soft">{totalDuration}</span>
      </div>

      <button
        type="button"
        onClick={onSynthesize}
        disabled={disabled}
        className="group flex w-full items-center justify-between gap-4 bg-ink px-6 py-8 text-left text-background transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 md:px-10 md:py-12"
      >
        <span className="font-serif text-3xl font-medium leading-none tracking-tight md:text-5xl">
          Synthesize {count} voices
        </span>
        <span className="text-3xl transition-transform group-enabled:group-hover:translate-x-1 md:text-5xl">
          {'\u2192'}
        </span>
      </button>

      {disabled && (
        <p className="mono mt-4 text-[11px] text-ink-soft">
          Add at least two voices — synthesis needs more than one perspective to compare.
        </p>
      )}
    </div>
  )
}
