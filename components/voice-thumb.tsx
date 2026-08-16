type VoiceThumbProps = {
  n: number
  duration?: string
  className?: string
}

// Editorial source marker — deliberately NOT a big YouTube thumbnail.
// A bordered box that identifies the source with a number + play glyph.
export function VoiceThumb({ n, duration, className = '' }: VoiceThumbProps) {
  return (
    <div
      className={`relative flex aspect-video items-center justify-center border border-line bg-paper-2 ${className}`}
      aria-hidden="true"
    >
      <span className="mono absolute left-2 top-2 text-[10px] text-ink-soft">
        {String(n).padStart(2, '0')}
      </span>
      <svg width="22" height="22" viewBox="0 0 24 24" className="text-ink">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
      {duration && (
        <span className="mono absolute bottom-2 right-2 bg-ink px-1.5 py-0.5 text-[10px] text-background">
          {duration}
        </span>
      )}
    </div>
  )
}
