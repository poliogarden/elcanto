'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { VideoGridSkeleton } from '@/components/home/video-grid-skeleton'
import { VideoSection } from '@/components/home/video-section'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'
import { VideoCard } from '@/components/video/video-card'
import { VideoGrid } from '@/components/video/video-grid'
import { useLibrary } from '@/lib/hooks/use-library'
import { useShelves } from '@/lib/hooks/use-shelves'
import { libraryItemToVideoSource } from '@/lib/types/library'
import { useWorkspace } from '@/lib/workspace/workspace-provider'
import { isVideoSelected } from '@/lib/voice/source-selection'
import { useTranslation } from '@/lib/i18n/locale-context'

type Props = {
  params: Promise<{ id: string }>
}

export default function ShelfPage({ params }: Props) {
  const { t } = useTranslation()
  const [shelfId, setShelfId] = useState<string | null>(null)
  const [items, setItems] = useState<ReturnType<typeof libraryItemToVideoSource>[]>([])
  const [loading, setLoading] = useState(true)
  const [shelfName, setShelfName] = useState('')
  const { savedIds, save, unsave } = useLibrary()
  const shelves = useShelves()
  const ws = useWorkspace()

  useEffect(() => {
    void params.then((p) => setShelfId(p.id))
  }, [params])

  useEffect(() => {
    if (!shelfId) return
    const shelf = shelves.shelves.find((s) => s.id === shelfId)
    if (shelf) setShelfName(shelf.name)

    setLoading(true)
    void fetch(`/api/library/shelves/${shelfId}`)
      .then((res) => res.json())
      .then((data: { items?: Parameters<typeof libraryItemToVideoSource>[0][] }) => {
        setItems((data.items ?? []).map(libraryItemToVideoSource))
      })
      .finally(() => setLoading(false))
  }, [shelfId, shelves.shelves])

  async function handleDeleteShelf() {
    if (!shelfId) return
    if (!window.confirm(t('library.deleteShelf'))) return
    const ok = await shelves.deleteShelf(shelfId)
    if (ok) window.location.href = '/library'
  }

  return (
    <WorkspaceShell>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/library" className="text-sm text-ink-soft hover:text-ink">
            ← {t('library.title')}
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-ink">{shelfName || '…'}</h1>
        </div>
        <button
          type="button"
          onClick={() => void handleDeleteShelf()}
          className="text-xs text-ink-soft hover:text-destructive"
        >
          {t('library.deleteShelf')}
        </button>
      </div>

      {loading && (
        <div className="mt-6">
          <VideoGridSkeleton count={8} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-10 text-center">
          <p className="text-sm text-ink-soft">{t('library.noShelfVideos')}</p>
          <Link href="/library" className="mt-3 inline-block text-sm font-medium text-ink">
            {t('library.browseLibrary')}
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && (
        <VideoSection title={t('library.shelfVideoCount', { count: items.length })} className="mt-6">
          <VideoGrid>
            {items.map((item) => {
              const selected = isVideoSelected(ws.voices, item.videoId)
              const order = ws.voices.find((v) => v.youtubeId === item.videoId)?.n
              return (
                <VideoCard
                  key={item.videoId}
                  item={item}
                  selected={selected}
                  selectionOrder={selected ? order : undefined}
                  saved={savedIds.has(item.videoId)}
                  onToggle={() => ws.handleToggleItem(item)}
                  onSave={save}
                  onUnsave={unsave}
                />
              )
            })}
          </VideoGrid>
        </VideoSection>
      )}
    </WorkspaceShell>
  )
}
