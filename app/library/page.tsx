'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ShelfCard } from '@/components/library/shelf-card'
import { ShelfAssignMenu } from '@/components/library/shelf-assign-menu'
import { SynthesisSearchBar } from '@/components/home/synthesis-search-bar'
import { VideoGridSkeleton } from '@/components/home/video-grid-skeleton'
import { VideoSection } from '@/components/home/video-section'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'
import { VideoCard } from '@/components/video/video-card'
import { VideoGrid } from '@/components/video/video-grid'
import { useLibrary } from '@/lib/hooks/use-library'
import { useShelves } from '@/lib/hooks/use-shelves'
import { searchLibraryItems } from '@/lib/library/library-search'
import { libraryItemToVideoSource } from '@/lib/types/library'
import { useWorkspace } from '@/lib/workspace/workspace-provider'
import { isVideoSelected } from '@/lib/voice/source-selection'
import { useTranslation } from '@/lib/i18n/locale-context'

type View = 'home' | 'unfiled' | 'all'

export default function LibraryPage() {
  const { t } = useTranslation()
  const { items, loading, requiresAuth, savedIds, save, unsave } = useLibrary()
  const shelves = useShelves()
  const ws = useWorkspace()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('home')
  const [creatingShelf, setCreatingShelf] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')

  const searchResults = useMemo(() => searchLibraryItems(items, search), [items, search])

  const recentlyCollected = useMemo(() => items.slice(0, 8), [items])

  const displayItems = useMemo(() => {
    if (view === 'unfiled') return shelves.unfiled
    if (view === 'all') return searchResults
    return search ? searchResults : []
  }, [view, shelves.unfiled, searchResults, search])

  function renderVideoGrid(videoItems: ReturnType<typeof libraryItemToVideoSource>[]) {
    return (
      <VideoGrid>
        {videoItems.map((item) => {
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
    )
  }

  async function handleCreateShelf() {
    const name = newShelfName.trim()
    if (!name) return
    await shelves.createShelf(name)
    setNewShelfName('')
    setCreatingShelf(false)
  }

  function handleSelectAll() {
    ws.handleBatchAdd(searchResults.map(libraryItemToVideoSource))
  }

  return (
    <WorkspaceShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-ink">{t('library.title')}</h1>
        <div className="w-full max-w-md">
          <SynthesisSearchBar
            query={search}
            addingBatch={false}
            placeholder={t('library.searchPlaceholder')}
            onQueryChange={setSearch}
            onSubmit={() => {
              if (search.trim()) setView('all')
            }}
          />
        </div>
      </div>

      {requiresAuth && (
        <p className="mt-4 text-sm text-ink-soft">{t('library.signInToSave')}</p>
      )}

      {(loading || shelves.loading) && (
        <div className="mt-6">
          <VideoGridSkeleton count={10} />
        </div>
      )}

      {!loading && !shelves.loading && view === 'home' && !search && (
        <>
          {recentlyCollected.length > 0 && (
            <VideoSection title={t('library.recentlyCollected')}>
              {renderVideoGrid(recentlyCollected.map(libraryItemToVideoSource))}
            </VideoSection>
          )}

          <VideoSection title={t('library.shelves')}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {!creatingShelf ? (
                <button
                  type="button"
                  onClick={() => setCreatingShelf(true)}
                  className="text-sm font-medium text-ink hover:opacity-70"
                >
                  {t('library.createShelf')}
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newShelfName}
                    onChange={(e) => setNewShelfName(e.target.value)}
                    placeholder={t('library.shelfName')}
                    className="rounded-lg bg-paper-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleCreateShelf()
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateShelf()}
                    className="text-sm font-medium text-ink"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
            {shelves.shelves.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {shelves.shelves.map((shelf) => (
                  <ShelfCard key={shelf.id} shelf={shelf} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">{t('library.emptyHint')}</p>
            )}
          </VideoSection>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setView('unfiled')}
              className="flex w-full items-center justify-between rounded-xl bg-paper-2/50 px-4 py-3 text-left transition-colors hover:bg-paper-2/80"
            >
              <span className="text-sm font-semibold text-ink">{t('library.unfiled')}</span>
              <span className="text-sm text-ink-soft">
                {t('library.unfiledCount', { count: shelves.unfiledCount })}
              </span>
            </button>
          </div>

          {items.length === 0 && (
            <div className="mt-10 text-center">
              <p className="text-sm text-ink-soft">{t('library.empty')}</p>
              <p className="mt-2 text-sm text-ink-soft">{t('library.emptyHint')}</p>
              <Link href="/" className="mt-4 inline-block text-sm font-medium text-ink">
                Home →
              </Link>
            </div>
          )}
        </>
      )}

      {!loading && search && (
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              {t('library.videosFound', { count: searchResults.length })}
            </p>
            {searchResults.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm font-medium text-ink hover:opacity-70"
              >
                {t('library.selectAll')}
              </button>
            )}
          </div>
          {searchResults.length > 0 ? (
            renderVideoGrid(searchResults.map(libraryItemToVideoSource))
          ) : (
            <p className="text-sm text-ink-soft">{t('source.noVideosFound')}</p>
          )}
        </div>
      )}

      {!loading && view === 'unfiled' && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setView('home')}
            className="mb-4 text-sm text-ink-soft hover:text-ink"
          >
            ← {t('library.title')}
          </button>
          <VideoSection title={t('library.unfiled')}>
            {shelves.unfiled.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {shelves.unfiled.map((item) => {
                  const video = libraryItemToVideoSource(item)
                  const selected = isVideoSelected(ws.voices, video.videoId)
                  const order = ws.voices.find((v) => v.youtubeId === video.videoId)?.n
                  return (
                    <div key={video.videoId}>
                      <VideoCard
                        item={video}
                        selected={selected}
                        selectionOrder={selected ? order : undefined}
                        saved={savedIds.has(video.videoId)}
                        onToggle={() => ws.handleToggleItem(video)}
                        onSave={save}
                        onUnsave={unsave}
                      />
                      <ShelfAssignMenu
                        shelves={shelves.shelves}
                        onAssign={(shelfId) => void shelves.addToShelf(shelfId, video.videoId)}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">{t('library.noShelfVideos')}</p>
            )}
          </VideoSection>
        </div>
      )}

      {!loading && view === 'all' && !search && displayItems.length > 0 && (
        <VideoSection title={t('library.filter.all')} className="mt-6">
          {renderVideoGrid(displayItems.map(libraryItemToVideoSource))}
        </VideoSection>
      )}
    </WorkspaceShell>
  )
}
