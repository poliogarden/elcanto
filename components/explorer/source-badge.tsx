'use client'

import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'

type Props = {
  voiceIndex: number
  videoId: string
  thumbnail?: string
  title?: string
  size?: 'sm' | 'md'
  highlighted?: boolean
  muted?: boolean
  onClick?: () => void
}

export function SourceBadge({
  voiceIndex,
  videoId,
  thumbnail,
  title,
  size = 'sm',
  highlighted = false,
  muted = false,
  onClick,
}: Props) {
  const thumb = resolveVideoThumbnail(videoId, thumbnail)
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const label = `V${String(voiceIndex).padStart(2, '0')}`

  const inner = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 transition-colors ${
        highlighted
          ? 'border-ink bg-ink text-background'
          : muted
            ? 'border-line/50 bg-paper-2/30 text-ink-soft/60'
            : 'border-line bg-background text-ink'
      }`}
      title={title}
    >
      {thumb ? (
        <img src={thumb} alt="" className={`${dim} rounded-full object-cover`} />
      ) : (
        <span
          className={`${dim} flex items-center justify-center rounded-full bg-paper-2 font-mono text-[9px]`}
        >
          {label}
        </span>
      )}
      <span className="font-mono text-[10px] font-semibold">{label}</span>
    </span>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="shrink-0">
        {inner}
      </button>
    )
  }
  return inner
}
