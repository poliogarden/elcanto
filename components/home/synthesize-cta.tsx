type Props = {
  readyCount: number
  onSynthesize: () => void
  disabled?: boolean
}

function ctaLabel(count: number): string {
  if (count === 0) return 'SELECT VIDEOS TO BEGIN'
  if (count === 1) return 'SELECT ONE MORE VIDEO'
  return `SYNTHESIZE ${count} VIDEO${count === 1 ? '' : 'S'} →`
}

export function SynthesizeCTA({ readyCount, onSynthesize, disabled }: Props) {
  const canSynthesize = readyCount >= 2 && !disabled

  return (
    <div className="mt-5 border-t border-line pt-5">
      {readyCount > 0 && (
        <p className="mono-label mb-3 text-[10px] text-ink-soft">
          {readyCount} VIDEO{readyCount === 1 ? '' : 'S'} SELECTED
        </p>
      )}

      <button
        type="button"
        disabled={!canSynthesize}
        onClick={onSynthesize}
        className={`mono-label w-full px-6 py-4 text-[11px] transition-opacity sm:w-auto ${
          canSynthesize
            ? 'bg-ink text-background hover:opacity-90'
            : 'border border-line bg-background text-ink-soft'
        }`}
      >
        {ctaLabel(readyCount)}
      </button>
    </div>
  )
}
