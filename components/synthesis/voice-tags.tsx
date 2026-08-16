type VoiceTagsProps = {
  voices: number[]
  className?: string
}

export function VoiceTags({ voices, className = '' }: VoiceTagsProps) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {voices.map((n) => (
        <span
          key={n}
          className="mono flex h-7 min-w-7 items-center justify-center border border-line px-1.5 text-[11px] text-ink"
        >
          {String(n).padStart(2, '0')}
        </span>
      ))}
    </div>
  )
}
