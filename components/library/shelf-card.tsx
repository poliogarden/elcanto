'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { ShelfWithPreview } from '@/lib/types/shelf'

type Props = {
  shelf: ShelfWithPreview
}

export function ShelfCard({ shelf }: Props) {
  const { t } = useTranslation()
  const thumbs = shelf.previewThumbnails

  return (
    <Link
      href={`/library/shelf/${shelf.id}`}
      className="group block overflow-hidden rounded-xl bg-paper-2/40 transition-colors hover:bg-paper-2/70"
    >
      <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5 bg-paper-2 p-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden bg-paper-2">
            {thumbs[i] ? (
              <img src={thumbs[i]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-paper-2/80" />
            )}
          </div>
        ))}
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-ink">{shelf.name}</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {t('library.shelfVideoCount', { count: shelf.videoCount })}
        </p>
      </div>
    </Link>
  )
}
