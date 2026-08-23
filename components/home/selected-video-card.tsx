'use client'

import { useTranslation } from '@/lib/i18n/locale-context'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voice: Voice
  compact?: boolean
  onRemove: (id: string) => void
}

export function SelectedVideoCard({ voice, compact = false, onRemove }: Props) {
  const { t } = useTranslation()
  const thumbnail = resolveVideoThumbnail(voice.youtubeId, voice.thumbnail)
  const label = t('home.videoLabel', { index: String(voice.n).padStart(2, '0') })

  return (
    <article className="group relative flex min-w-0 flex-col">
      <p className="mono-label mb-2 text-[10px] text-ink-soft">{label}</p>

      <div
        className={`relative overflow-hidden rounded-sm border border-line/80 bg-paper-2 ${
          compact ? '' : ''
        }`}
      >
        <div className="relative aspect-video w-full bg-paper-2">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="mono text-[10px] text-ink-soft">{label}</span>
            </div>
          )}
          {voice.duration && voice.duration !== '—' && (
            <span className="mono absolute bottom-2 right-2 rounded-sm bg-ink/90 px-1.5 py-0.5 text-[10px] text-background">
              {voice.duration}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRemove(voice.id)}
          aria-label={t('selection.removeVideo', { title: voice.title })}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-sm border border-line/70 bg-background/95 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span aria-hidden>×</span>
        </button>
      </div>

      <div className={`min-w-0 ${compact ? 'mt-2' : 'mt-3'}`}>
        <h3
          className={`line-clamp-2 font-serif font-medium leading-snug text-ink ${
            compact ? 'text-sm' : 'text-base md:text-[1.05rem]'
          }`}
        >
          {voice.title}
        </h3>
        <p className="mono mt-1 truncate text-[10px] text-ink-soft">{voice.channel}</p>
      </div>
    </article>
  )
}
