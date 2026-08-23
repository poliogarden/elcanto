'use client'

import type { VideoSourceItem } from '@/lib/types/selected-source'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import { SaveButton } from '@/components/video/save-button'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  item: VideoSourceItem
  saved: boolean
  onSave: (video: VideoSourceItem) => Promise<'saved' | 'auth' | 'error'>
  onUnsave: (youtubeId: string) => Promise<boolean>
  onSelect: () => void
}

export function UrlCollectPreview({ item, saved, onSave, onUnsave, onSelect }: Props) {
  const { t } = useTranslation()
  const thumb = item.thumbnail ?? resolveVideoThumbnail(item.videoId)

  return (
    <div className="mt-4 flex gap-4 rounded-xl bg-paper-2/70 p-4">
      <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-48">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-200/50 text-xs text-ink-soft">
            —
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="line-clamp-2 text-sm font-medium text-ink">{item.title}</h3>
          <p className="mt-1 text-xs text-ink-soft">{item.channelTitle}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <SaveButton video={item} saved={saved} onSave={onSave} onUnsave={onUnsave} />
          <button
            type="button"
            onClick={onSelect}
            className="text-sm font-medium text-ink hover:opacity-70"
          >
            {t('library.select')}
          </button>
        </div>
      </div>
    </div>
  )
}
