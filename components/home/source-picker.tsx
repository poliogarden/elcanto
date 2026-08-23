'use client'

import { signIn, useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SynthesisSearchBar } from '@/components/home/synthesis-search-bar'
import { VIDEO_GRID_CLASS, VideoGridSkeleton } from '@/components/home/video-grid-skeleton'
import { VideoSourceCard } from '@/components/home/video-source-card'
import { useTranslation } from '@/lib/i18n/locale-context'
import type {
  ChannelListItem,
  PlaylistListItem,
  SourcePickerTab,
  VideoSourceItem,
} from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'
import { parsePasteInput } from '@/lib/youtube/parse-paste-input'
import { YOUTUBE_SCOPES } from '@/lib/youtube/scopes'
import { isVideoSelected, metadataToVideoSource } from '@/lib/voice/source-selection'
import type { YouTubeMetadata } from '@/lib/types/voice'

const INITIAL_VISIBLE = 15

type Props = {
  voices: Voice[]
  onToggleItem: (item: VideoSourceItem) => void
  onBatchAdd: (items: VideoSourceItem[]) => void
}

export function SourcePicker({
  voices,
  onToggleItem,
  onBatchAdd,
}: Props) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const youtubeConnected = Boolean(session?.user?.youtubeConnected)

  const tabs = useMemo(
    (): { id: SourcePickerTab; label: string }[] => [
      { id: 'recent', label: t('source.recent') },
      { id: 'likes', label: t('source.likes') },
      { id: 'playlists', label: t('source.playlists') },
      { id: 'channels', label: t('source.channels') },
    ],
    [t],
  )

  function loadingMessage(tabId: SourcePickerTab): string {
    switch (tab) {
      case 'search':
        return t('source.searching')
      case 'recent':
        return t('source.loadingRecent')
      case 'likes':
        return t('source.loadingLikes')
      case 'playlists':
        return t('source.loadingPlaylists')
      case 'channels':
        return t('source.loadingChannels')
      default:
        return t('source.loading')
    }
  }

  function connectTabLabel(tabId: SourcePickerTab): string {
    if (tabId === 'likes') return t('source.tabLikes')
    if (tabId === 'playlists') return t('source.tabPlaylists')
    return t('source.tabChannels')
  }

  const [tab, setTab] = useState<SourcePickerTab>('recent')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [items, setItems] = useState<VideoSourceItem[]>([])
  const [playlists, setPlaylists] = useState<PlaylistListItem[]>([])
  const [channels, setChannels] = useState<ChannelListItem[]>([])
  const [activePlaylist, setActivePlaylist] = useState<PlaylistListItem | null>(null)
  const [activeChannel, setActiveChannel] = useState<ChannelListItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasteHint, setPasteHint] = useState<
    | { kind: 'videos'; count: number; videoIds: string[] }
    | { kind: 'playlist'; playlistId: string; title?: string; count?: number }
    | null
  >(null)
  const [addingBatch, setAddingBatch] = useState(false)
  const [showAllVideos, setShowAllVideos] = useState(false)
  const browseRef = useRef<HTMLDivElement>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(query.trim()), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const connectYouTube = useCallback(() => {
    void signIn(
      'google',
      { callbackUrl: '/' },
      { scope: YOUTUBE_SCOPES, access_type: 'offline', prompt: 'consent' },
    )
  }, [])

  const loadTab = useCallback(async () => {
    setError(null)
    setLoading(true)
    setActivePlaylist(null)
    setActiveChannel(null)

    try {
      if (tab === 'search') {
        if (debouncedQuery.length < 2) {
          const recentRes = await fetch('/api/youtube/recent')
          const recentData = (await recentRes.json()) as { items?: VideoSourceItem[] }
          const recent = recentData.items ?? []
          setItems(recent)
          return
        }
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(debouncedQuery)}`)
        const data = (await res.json()) as { items?: VideoSourceItem[]; error?: string }
        if (!res.ok) throw new Error(data.error ?? t('source.searchFailed'))
        setItems(data.items ?? [])
        return
      }

      if (tab === 'recent') {
        const res = await fetch('/api/youtube/recent')
        const data = (await res.json()) as { items?: VideoSourceItem[] }
        const recent = data.items ?? []
        setItems(recent)
        return
      }

      if (tab === 'likes') {
        const res = await fetch('/api/youtube/likes')
        const data = (await res.json()) as {
          items?: VideoSourceItem[]
          error?: string
          requiresAuth?: boolean
          requiresYouTube?: boolean
        }
        if (!res.ok) {
          if (data.requiresYouTube || data.requiresAuth) {
            setItems([])
            setError(data.error ?? t('source.connectForLikes'))
            return
          }
          throw new Error(data.error ?? t('source.loadLikesFailed'))
        }
        setItems(data.items ?? [])
        return
      }

      if (tab === 'playlists') {
        const res = await fetch('/api/youtube/playlists')
        const data = (await res.json()) as {
          playlists?: PlaylistListItem[]
          error?: string
          requiresYouTube?: boolean
        }
        if (!res.ok) {
          setPlaylists([])
          setError(data.error ?? t('source.connectForPlaylists'))
          return
        }
        setPlaylists(data.playlists ?? [])
        return
      }

      if (tab === 'channels') {
        const res = await fetch('/api/youtube/subscriptions')
        const data = (await res.json()) as {
          channels?: ChannelListItem[]
          error?: string
          requiresYouTube?: boolean
        }
        if (!res.ok) {
          setChannels([])
          setError(data.error ?? t('source.connectForChannels'))
          return
        }
        setChannels(data.channels ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('source.loadVideosFailed'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tab, debouncedQuery, t])

  useEffect(() => {
    void loadTab()
    setShowAllVideos(false)
  }, [loadTab])

  async function openPlaylist(playlist: PlaylistListItem) {
    setActivePlaylist(playlist)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/youtube/playlists/${playlist.playlistId}/videos`)
      const data = (await res.json()) as { items?: VideoSourceItem[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? t('source.loadPlaylistFailed'))
      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('source.loadPlaylistFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function openChannel(channel: ChannelListItem) {
    setActiveChannel(channel)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/youtube/channels/${channel.channelId}/videos`)
      const data = (await res.json()) as { items?: VideoSourceItem[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? t('source.loadChannelFailed'))
      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('source.loadChannelFailed'))
    } finally {
      setLoading(false)
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    const parsed = parsePasteInput(value)
    if (parsed.kind === 'videos' && parsed.videoIds.length > 1) {
      setPasteHint({ kind: 'videos', count: parsed.videoIds.length, videoIds: parsed.videoIds })
      return
    }
    if (parsed.kind === 'playlist') {
      setPasteHint({ kind: 'playlist', playlistId: parsed.playlistId })
      void detectPlaylist(parsed.playlistId)
      return
    }
    setPasteHint(null)
  }

  async function detectPlaylist(playlistId: string) {
    try {
      const res = await fetch('/api/youtube/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: playlistId }),
      })
      const data = (await res.json()) as {
        title?: string
        count?: number
        items?: VideoSourceItem[]
        requiresYouTube?: boolean
        error?: string
      }
      if (data.requiresYouTube) {
        setPasteHint({ kind: 'playlist', playlistId, title: t('source.playlistDetected') })
        setError(t('source.connectForPlaylist'))
        return
      }
      if (data.items) {
        setTab('search')
        setItems(data.items)
        setPasteHint({
          kind: 'playlist',
          playlistId,
          title: data.title,
          count: data.count,
        })
      }
    } catch {
      setPasteHint({ kind: 'playlist', playlistId })
    }
  }

  async function addPastedVideos() {
    if (pasteHint?.kind !== 'videos') return
    setAddingBatch(true)
    try {
      const newItems: VideoSourceItem[] = []
      for (const videoId of pasteHint.videoIds) {
        if (isVideoSelected(voices, videoId)) continue
        const res = await fetch('/api/youtube/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}` }),
        })
        const data = (await res.json()) as YouTubeMetadata & { error?: string }
        if (res.ok && data.youtubeId) {
          newItems.push(metadataToVideoSource(data, 'url'))
        }
      }
      if (newItems.length > 0) onBatchAdd(newItems)
      setQuery('')
      setPasteHint(null)
    } finally {
      setAddingBatch(false)
    }
  }

  async function addSingleUrl() {
    const trimmed = query.trim()
    if (!trimmed) return
    const parsed = parsePasteInput(trimmed)
    if (parsed.kind === 'videos' && parsed.videoIds.length === 1) {
      setAddingBatch(true)
      try {
        const res = await fetch('/api/youtube/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        })
        const data = (await res.json()) as YouTubeMetadata & { error?: string }
        if (!res.ok) throw new Error(data.error ?? t('source.addVideoFailed'))
        onToggleItem(metadataToVideoSource(data, 'url'))
        setQuery('')
      } catch (err) {
        setError(err instanceof Error ? err.message : t('source.addVideoFailed'))
      } finally {
        setAddingBatch(false)
      }
    }
  }

  const showVideoGrid = tab === 'search' || tab === 'recent' || tab === 'likes' || activePlaylist || activeChannel

  const gridItems = items

  const visibleItems = showAllVideos ? gridItems : gridItems.slice(0, INITIAL_VISIBLE)
  const hasMoreVideos = gridItems.length > INITIAL_VISIBLE

  function handleSearchSubmit() {
    if (pasteHint?.kind === 'videos') void addPastedVideos()
    else if (parsePasteInput(query).kind === 'videos') void addSingleUrl()
    else {
      const trimmed = query.trim()
      setDebouncedQuery(trimmed)
      if (trimmed.length >= 2) setTab('search')
    }
  }

  return (
    <div className="w-full">
      <SynthesisSearchBar
        query={query}
        addingBatch={addingBatch}
        pasteHintCount={pasteHint?.kind === 'videos' ? pasteHint.count : undefined}
        onQueryChange={handleQueryChange}
        onSubmit={handleSearchSubmit}
      />

      {pasteHint?.kind === 'videos' && pasteHint.count > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-paper-2/70 px-4 py-3">
          <span className="text-sm text-ink">{t('source.videosFound', { count: pasteHint.count })}</span>
          <button
            type="button"
            onClick={() => void addPastedVideos()}
            disabled={addingBatch}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-background"
          >
            {t('source.addVoices', { count: pasteHint.count })}
          </button>
        </div>
      )}

      <div id="source-browse" ref={browseRef} className="mt-5 scroll-mt-16">
      {tab === 'search' && debouncedQuery.length >= 2 && (
        <p className="mb-3 text-sm text-ink-soft">
          {t('source.searchResults', { query: debouncedQuery })}
        </p>
      )}

      {pasteHint?.kind === 'playlist' && (
        <div className="mt-3 rounded-xl bg-paper-2/70 px-4 py-3">
          <p className="text-sm font-medium text-ink">{t('source.playlistDetected')}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {pasteHint.title ?? pasteHint.playlistId}
            {pasteHint.count !== undefined
              ? ` · ${t('source.videoCount', { count: pasteHint.count })}`
              : ''}
          </p>
          <p className="mt-2 text-xs text-ink-soft">{t('source.playlistSelectHint')}</p>
          {!youtubeConnected && (
            <button
              type="button"
              onClick={connectYouTube}
              className="mt-3 text-sm font-medium text-ink hover:opacity-70"
            >
              {t('source.connectToSelect')}
            </button>
          )}
        </div>
      )}

      <nav
        className="mt-4 flex gap-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t('source.sourceTabs')}
      >
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`shrink-0 pb-1 text-sm font-medium transition-colors ${
              tab === tabItem.id && tab !== 'search'
                ? 'text-ink'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </nav>

      {(tab === 'likes' || tab === 'playlists' || tab === 'channels') && !youtubeConnected && (
        <div className="mt-5 rounded-xl bg-paper-2/60 px-4 py-4">
          <p className="text-sm text-ink-soft">
            {t('source.connectForTab', { tab: connectTabLabel(tab) })}
          </p>
          <button
            type="button"
            onClick={connectYouTube}
            className="mt-3 text-sm font-medium text-ink hover:opacity-70"
          >
            {t('source.connectYouTubeAction')}
          </button>
        </div>
      )}

      {(activePlaylist || activeChannel) && (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              setActivePlaylist(null)
              setActiveChannel(null)
              void loadTab()
            }}
            className="text-sm text-ink-soft hover:text-ink"
          >
            {tab === 'playlists' ? t('source.backToPlaylists') : t('source.backToChannels')}
          </button>
          {activePlaylist && (
            <p className="text-sm text-ink-soft">
              {activePlaylist.title}
              {activePlaylist.itemCount !== undefined
                ? ` · ${t('source.videoCount', { count: activePlaylist.itemCount })}`
                : ''}
              {' · '}
              {t('source.playlistSelectHint')}
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="mt-5">
          <p className="sr-only">{loadingMessage(tab)}</p>
          <VideoGridSkeleton count={10} />
        </div>
      )}

      {error && !loading && (
        <p className="mt-5 text-sm text-ink-soft" role="alert">
          {error}
        </p>
      )}

      {tab === 'playlists' && !activePlaylist && !loading && playlists.length > 0 && (
        <ul className="mt-5 divide-y divide-black/5">
          {playlists.map((p) => (
            <li key={p.playlistId}>
              <button
                type="button"
                onClick={() => void openPlaylist(p)}
                className="flex w-full items-center gap-4 py-3 text-left hover:opacity-80"
              >
                {p.thumbnail && (
                  <img src={p.thumbnail} alt="" className="h-11 w-20 shrink-0 rounded-md object-cover" />
                )}
                <span className="text-sm font-medium text-ink">{p.title}</span>
                {p.itemCount !== undefined && (
                  <span className="ml-auto text-xs text-ink-soft">{p.itemCount}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'channels' && !activeChannel && !loading && channels.length > 0 && (
        <ul className="mt-5 divide-y divide-black/5">
          {channels.map((c) => (
            <li key={c.channelId}>
              <button
                type="button"
                onClick={() => void openChannel(c)}
                className="flex w-full items-center gap-4 py-3 text-left hover:opacity-80"
              >
                <span className="text-sm font-medium text-ink">{c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showVideoGrid && !loading && visibleItems.length > 0 && (
        <>
          <div className={`mt-5 ${VIDEO_GRID_CLASS}`}>
            {visibleItems.map((item) => {
              const selected = isVideoSelected(voices, item.videoId)
              const selectionOrder = voices.find((v) => v.youtubeId === item.videoId)?.n
              return (
                <VideoSourceCard
                  key={item.videoId}
                  item={item}
                  selected={selected}
                  selectionOrder={selected ? selectionOrder : undefined}
                  onToggle={() => onToggleItem(item)}
                />
              )
            })}
          </div>
          {hasMoreVideos && (
            <button
              type="button"
              onClick={() => setShowAllVideos((v) => !v)}
              className="mt-6 text-sm font-medium text-ink hover:opacity-70"
            >
              {showAllVideos
                ? t('source.showFewer')
                : t('source.viewAll', { count: gridItems.length })}
            </button>
          )}
        </>
      )}

      {showVideoGrid && !loading && gridItems.length === 0 && !error && (
        <p className="mt-8 text-sm text-ink-soft">
          {tab === 'search' ? t('source.searchOrPaste') : t('source.searchOrPaste')}
        </p>
      )}
      </div>
    </div>
  )
}
