'use client'

import { useTranslation } from '@/lib/i18n/locale-context'
import type { ShelfWithPreview } from '@/lib/types/shelf'

type Props = {
  shelves: ShelfWithPreview[]
  onAssign: (shelfId: string) => void
}

export function ShelfAssignMenu({ shelves, onAssign }: Props) {
  const { t } = useTranslation()
  if (shelves.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {shelves.map((shelf) => (
        <button
          key={shelf.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAssign(shelf.id)
          }}
          className="rounded-md bg-paper-2 px-2 py-0.5 text-[11px] text-ink hover:bg-paper-2/80"
        >
          {t('library.addToShelf')}: {shelf.name}
        </button>
      ))}
    </div>
  )
}
