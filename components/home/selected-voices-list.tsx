'use client'

import { useTranslation } from '@/lib/i18n/locale-context'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import type { Voice } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  onRemove: (id: string) => void
}

export function SelectedVoicesList({ voices, onRemove }: Props) {
  const { t } = useTranslation()

  if (voices.length === 0) return null

  return (
    <ul className="space-y-2">
      {voices.map((voice) => {
        const thumbnail = resolveVideoThumbnail(voice.youtubeId, voice.thumbnail)
        return (
          <li
            key={voice.id}
            className="flex items-center gap-3 border border-line bg-background px-3 py-2.5 sm:px-4 sm:py-3"
          >
            <div className="relative h-12 w-[4.5rem] shrink-0 overflow-hidden border border-line bg-paper-2 sm:h-14 sm:w-24">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="mono text-[10px] text-ink-soft">
                    {String(voice.n).padStart(2, '0')}
                  </span>
                </div>
              )}
              <span className="mono absolute left-1 top-1 border border-line bg-background/95 px-1 py-0.5 text-[9px] text-ink">
                {String(voice.n).padStart(2, '0')}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-serif text-sm leading-snug text-ink">{voice.title}</p>
              <p className="mono mt-0.5 truncate text-[10px] text-ink-soft">{voice.channel}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(voice.id)}
              className="mono-label shrink-0 text-[9px] text-ink-soft hover:text-ink"
            >
              {t('selection.remove')}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
