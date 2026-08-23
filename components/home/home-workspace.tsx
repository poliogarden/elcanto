'use client'

import { signIn, useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SynthesisSearchBar } from '@/components/home/synthesis-search-bar'
import { UrlCollectPreview } from '@/components/home/url-collect-preview'
import { VideoSection } from '@/components/home/video-section'
import { VideoGridSkeleton } from '@/components/home/video-grid-skeleton'
import { VideoCard } from '@/components/video/video-card'
import { VideoGrid } from '@/components/video/video-grid'
import { useLibrary } from '@/lib/hooks/use-library'
import { libraryItemToVideoSource } from '@/lib/types/library'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'
import { parsePasteInput } from '@/lib/youtube/parse-paste-input'
import { metadataToVideoSource, isVideoSelected } from '@/lib/voice/source-selection'
import type { YouTubeMetadata } from '@/lib/types/voice'

type Props = {
  voices: Voice[]
  onToggleItem: (item: VideoSourceItem) => void
  onBatchAdd: (items: VideoSourceItem[]) => void
}

type YouTubeTab = 'likes' | 'playlists' | 'subscriptions'

export function HomeWorkspace({ voices, onToggleItem, onBatchAdd }: Props) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const { items: libraryItems, savedIds, save, unsave } = useLibrary()

  const [recent, setRecent] = useState<VideoSourceItem[]>([])
  const [youtubeTab, setYoutubeTab] = useState<YouTubeTab>('likes')
  const [liked, setLiked] = useState<VideoSourceItem[]>([])
  const [playlistVideos, setPlaylistVideos] = useState<VideoSourceItem[]>([])
  const [subscriptionVideos, setSubscriptionVideos] = useState<VideoSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VideoSourceItem[]>([])
  const [searching, setSearching] = useState(false)
  const [urlPreview, setUrlPreview] = useState<VideoSourceItem | null>(null)
  const [addingBatch, setAddingBatch] = useState(false)

  const youtubeConnected = Boolean(session?.user?.youtubeConnected)

  const recentlyCollected = useMemo(
    () => libraryItems.slice(0, 10).map(libraryItemToVideoSource),
    [libraryItems],
  )

  const loadSections = useCallback(async () => {
    setLoading(true)
    try {
      const recentRes = await fetch('/api/youtube/recent')
      const recentData = (await recentRes.json()) as { items?: VideoSourceItem[] }
      setRecent((recentData.items ?? []).slice(0, 10))

      if (youtubeConnected) {
        const [likesRes, playlistsRes, subsRes] = await Promise.all([
          fetch('/api/youtube/likes'),
          fetch('/api/youtube/playlists'),
          fetch('/api/youtube/subscriptions'),
        ])
        const likesData = (await likesRes.json()) as { items?: VideoSourceItem[] }
        setLiked((likesData.items ?? []).slice(0, 10))

        const playlistsData = (await playlistsRes.json()) as {
          playlists?: Array<{ playlistId: string }>
        }
        const first = playlistsData.playlists?.[0]
        if (first) {
          const pvRes = await fetch(`/api/youtube/playlists/${first.playlistId}/videos`)
          const pvData = (await pvRes.json()) as { items?: VideoSourceItem[] }
          setPlaylistVideos((pvData.items ?? []).slice(0, 10))
        } else {
          setPlaylistVideos([])
        }

        if (subsRes.ok) {
          const subsData = (await subsRes.json()) as {
            channels?: Array<{ channelId: string }>
          }
          const firstChannel = subsData.channels?.[0]
          if (firstChannel) {
            const cvRes = await fetch(`/api/youtube/channels/${firstChannel.channelId}/videos`)
            const cvData = (await cvRes.json()) as { items?: VideoSourceItem[] }
            setSubscriptionVideos((cvData.items ?? []).slice(0, 10))
          } else {
            setSubscriptionVideos([])
          }
        } else {
          setSubscriptionVideos([])
        }
      } else {
        setLiked([])
        setPlaylistVideos([])
        setSubscriptionVideos([])
      }
    } finally {
      setLoading(false)
    }
  }, [youtubeConnected])

  useEffect(() => {
    void loadSections()
  }, [loadSections])

  const youtubeTabItems = useMemo(() => {
    switch (youtubeTab) {
      case 'likes':
        return liked
      case 'playlists':
        return playlistVideos
      case 'subscriptions':
        return subscriptionVideos
      default:
        return []
    }
  }, [youtubeTab, liked, playlistVideos, subscriptionVideos])

  function renderGrid(items: VideoSourceItem[]) {
    return (
      <VideoGrid>
        {items.map((item) => {
          const selected = isVideoSelected(voices, item.videoId)
          const order = voices.find((v) => v.youtubeId === item.videoId)?.n
          return (
            <VideoCard
              key={item.videoId}
              item={item}
              selected={selected}
              selectionOrder={selected ? order : undefined}
              saved={savedIds.has(item.videoId)}
              onToggle={() => onToggleItem(item)}
              onSave={save}
              onUnsave={unsave}
            />
          )
        })}
      </VideoGrid>
    )
  }

  async function handleSearchSubmit() {
    const parsed = parsePasteInput(query)
    setUrlPreview(null)
    setSearchResults([])

    if (parsed.kind === 'videos' && parsed.videoIds.length === 1) {
      setAddingBatch(true)
      try {
        const res = await fetch('/api/youtube/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: query.trim() }),
        })
        const data = (await res.json()) as YouTubeMetadata & { error?: string }
        if (res.ok) setUrlPreview(metadataToVideoSource(data, 'url'))
      } finally {
        setAddingBatch(false)
      }
      return
    }

    if (parsed.kind === 'videos' && parsed.videoIds.length > 1) {
      setAddingBatch(true)
      try {
        const items: VideoSourceItem[] = []
        for (const id of parsed.videoIds.slice(0, 20)) {
          const res = await fetch('/api/youtube/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${id}` }),
          })
          const data = (await res.json()) as YouTubeMetadata
          if (res.ok) items.push(metadataToVideoSource(data, 'url'))
        }
        onBatchAdd(items)
        setQuery('')
      } finally {
        setAddingBatch(false)
      }
      return
    }

    const q = query.trim()
    if (q.length < 2) return
    setSearching(true)
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`)
      const data = (await res.json()) as { items?: VideoSourceItem[] }
      setSearchResults(data.items ?? [])
    } finally {
      setSearching(false)
    }
  }

  const showMainSections = !loading && searchResults.length === 0 && !urlPreview

  return (
    <div className="w-full">
      <SynthesisSearchBar
        query={query}
        addingBatch={addingBatch}
        onQueryChange={setQuery}
        onSubmit={() => void handleSearchSubmit()}
      />

      {urlPreview && (
        <UrlCollectPreview
          item={urlPreview}
          saved={savedIds.has(urlPreview.videoId)}
          onSave={save}
          onUnsave={unsave}
          onSelect={() => {
            onToggleItem(urlPreview)
            setUrlPreview(null)
            setQuery('')
          }}
        />
      )}

      {searchResults.length > 0 && (
        <VideoSection title={t('home.searchResults')}>
          {renderGrid(searchResults)}
        </VideoSection>
      )}

      {loading && searchResults.length === 0 && !urlPreview && (
        <div className="mt-6">
          <VideoGridSkeleton count={10} />
        </div>
      )}

      {showMainSections && (
        <>
          {recent.length > 0 && (
            <VideoSection title={t('home.sectionRecent')}>{renderGrid(recent)}</VideoSection>
          )}

          {recentlyCollected.length > 0 && (
            <VideoSection title={t('home.sectionRecentlyCollected')}>
              {renderGrid(recentlyCollected)}
            </VideoSection>
          )}

          <VideoSection title={t('home.sectionFromYouTube')}>
            {youtubeConnected ? (
              <>
                <div className="mb-4 flex gap-4">
                  {(['likes', 'playlists', 'subscriptions'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setYoutubeTab(tab)}
                      className={`pb-1 text-sm font-medium transition-colors ${
                        youtubeTab === tab ? 'text-ink' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {tab === 'likes'
                        ? t('home.sectionLiked')
                        : tab === 'playlists'
                          ? t('home.sectionPlaylists')
                          : t('home.sectionSubscriptions')}
                    </button>
                  ))}
                </div>
                {youtubeTabItems.length > 0 ? (
                  renderGrid(youtubeTabItems)
                ) : (
                  <p className="text-sm text-ink-soft">{t('source.noVideosFound')}</p>
                )}
              </>
            ) : (
              <div className="rounded-xl bg-paper-2/60 px-4 py-4">
                <p className="text-sm text-ink-soft">{t('home.connectYouTubeHint')}</p>
                <button
                  type="button"
                  onClick={() => void signIn('google')}
                  className="mt-3 text-sm font-medium text-ink hover:opacity-70"
                >
                  {t('source.connectYouTubeAction')}
                </button>
              </div>
            )}
          </VideoSection>

          {recent.length === 0 &&
            recentlyCollected.length === 0 &&
            !youtubeConnected && (
              <p className="mt-8 text-sm text-ink-soft">{t('source.searchOrPaste')}</p>
            )}
        </>
      )}

      {searching && (
        <div className="mt-6">
          <VideoGridSkeleton count={8} />
        </div>
      )}
    </div>
  )
}
