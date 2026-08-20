'use client'

import { signIn, useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SelectedVoicesPanel } from '@/components/home/selected-voices-panel'
import { VideoSourceCard } from '@/components/home/video-source-card'
import { DEMO_SYNTHESIS_MAP } from '@/lib/home/visual-synthesis-map-model'
import { useTranslation } from '@/lib/i18n/locale-context'
import type { SynthesisFocusPreset } from '@/lib/types/synthesis-focus'
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

const INITIAL_VISIBLE = 5

type Props = {
  voices: Voice[]
  readyCount: number
  focusPreset: SynthesisFocusPreset
  customPrompt: string
  onToggleItem: (item: VideoSourceItem) => void
  onBatchAdd: (items: VideoSourceItem[]) => void
  onRemove: (id: string) => void
  onFocusPreset: (preset: SynthesisFocusPreset) => void
  onCustomPrompt: (value: string) => void
  onSynthesize: () => void
}

export function SourcePicker({
  voices,
  readyCount,
  focusPreset,
  customPrompt,
  onToggleItem,
  onBatchAdd,
  onRemove,
  onFocusPreset,
  onCustomPrompt,
  onSynthesize,
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
      { id: 'search', label: t('source.search') },
    ],
    [t],
  )

  const sampleItems = useMemo(
    (): VideoSourceItem[] =>
      DEMO_SYNTHESIS_MAP.sources.map((s, i) => ({
        videoId: `sample_${i + 1}`,
        title: s.title,
        channelTitle: s.channel ?? t('source.sampleChannel'),
        thumbnail: s.thumbnail,
        duration: s.duration,
        sourceType: 'sample',
        sample: true,
      })),
    [t],
  )

  function loadingMessage(tab: SourcePickerTab): string {
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
          setItems(recent.length > 0 ? recent : sampleItems)
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
        setItems(recent.length > 0 ? recent : sampleItems)
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
  }, [tab, debouncedQuery, sampleItems, t])

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
  const showingSamples = items.some((i) => i.sample) && voices.length === 0

  const gridItems = useMemo(() => {
    if (voices.length > 0) {
      return items.filter((i) => !i.sample)
    }
    return items
  }, [items, voices.length])

  const visibleItems = showAllVideos ? gridItems : gridItems.slice(0, INITIAL_VISIBLE)
  const hasMoreVideos = gridItems.length > INITIAL_VISIBLE

  return (
    <div className="w-full">
      <div className="flex flex-col border border-line sm:flex-row">
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (pasteHint?.kind === 'videos') void addPastedVideos()
              else if (debouncedQuery.length >= 2) setDebouncedQuery(query.trim())
              else void addSingleUrl()
            }
          }}
          placeholder={t('home.searchPlaceholder')}
          className="mono flex-1 bg-transparent px-4 py-3.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (pasteHint?.kind === 'videos') void addPastedVideos()
            else if (parsePasteInput(query).kind === 'videos') void addSingleUrl()
            else setDebouncedQuery(query.trim())
          }}
          disabled={addingBatch || !query.trim()}
          className="mono-label border-t border-line bg-background px-5 py-3.5 text-[10px] text-ink transition-colors hover:bg-ink hover:text-background disabled:opacity-40 sm:border-l sm:border-t-0"
        >
          {addingBatch
            ? t('source.adding')
            : pasteHint?.kind === 'videos'
              ? t('source.addVoices', { count: pasteHint.count })
              : t('source.searchAction')}
        </button>
      </div>

      {pasteHint?.kind === 'videos' && pasteHint.count > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border border-line bg-paper-2/60 px-4 py-3">
          <span className="mono text-[11px] text-ink">
            {t('source.videosFound', { count: pasteHint.count })}
          </span>
          <button
            type="button"
            onClick={() => void addPastedVideos()}
            disabled={addingBatch}
            className="mono-label border border-line bg-ink px-4 py-2 text-[10px] text-background"
          >
            {t('source.addVoices', { count: pasteHint.count })}
          </button>
        </div>
      )}

      <SelectedVoicesPanel
        voices={voices}
        readyCount={readyCount}
        focusPreset={focusPreset}
        customPrompt={customPrompt}
        onRemove={onRemove}
        onFocusPreset={onFocusPreset}
        onCustomPrompt={onCustomPrompt}
        onSynthesize={onSynthesize}
      />

      {pasteHint?.kind === 'playlist' && (
        <div className="mt-3 border border-line bg-paper-2/60 px-4 py-3">
          <span className="mono-label text-[10px] text-ink-soft">{t('source.playlistDetected')}</span>
          <p className="mono mt-1 text-[11px] text-ink">
            {pasteHint.title ?? pasteHint.playlistId}
            {pasteHint.count !== undefined
              ? ` · ${t('source.videoCount', { count: pasteHint.count })}`
              : ''}
          </p>
          <p className="mono mt-2 text-[10px] text-ink-soft">{t('source.playlistSelectHint')}</p>
          {!youtubeConnected && (
            <button
              type="button"
              onClick={connectYouTube}
              className="mono-label mt-3 border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              {t('source.connectToSelect')}
            </button>
          )}
        </div>
      )}

      <nav
        className="mt-4 flex gap-4 overflow-x-auto border-b border-line pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t('source.sourceTabs')}
      >
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`mono-label shrink-0 text-[10px] transition-opacity hover:opacity-60 ${
              tab === tabItem.id
                ? 'border-b border-ink pb-0.5 text-ink'
                : 'border-b border-transparent pb-0.5 text-ink-soft'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </nav>

      {(tab === 'likes' || tab === 'playlists' || tab === 'channels') && !youtubeConnected && (
        <div className="mt-4 border border-line bg-paper-2/50 px-4 py-4">
          <p className="font-serif text-base text-ink-soft">
            {t('source.connectForTab', { tab: connectTabLabel(tab) })}
          </p>
          <button
            type="button"
            onClick={connectYouTube}
            className="mono-label mt-3 border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
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
            className="mono-label text-[10px] text-ink hover:opacity-60"
          >
            {tab === 'playlists' ? t('source.backToPlaylists') : t('source.backToChannels')}
          </button>
          {activePlaylist && (
            <p className="mono text-[10px] text-ink-soft">
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
        <p className="mono mt-6 text-[11px] text-ink-soft">{loadingMessage(tab)}</p>
      )}

      {error && !loading && (
        <p className="mono mt-6 text-[11px] text-ink-soft" role="alert">
          {error}
        </p>
      )}

      {tab === 'playlists' && !activePlaylist && !loading && playlists.length > 0 && (
        <ul className="mt-4 divide-y divide-line border border-line">
          {playlists.map((p) => (
            <li key={p.playlistId}>
              <button
                type="button"
                onClick={() => void openPlaylist(p)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-paper-2/50"
              >
                {p.thumbnail && (
                  <img src={p.thumbnail} alt="" className="h-10 w-16 shrink-0 object-cover" />
                )}
                <span className="font-serif text-base">{p.title}</span>
                {p.itemCount !== undefined && (
                  <span className="mono ml-auto text-[10px] text-ink-soft">{p.itemCount}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'channels' && !activeChannel && !loading && channels.length > 0 && (
        <ul className="mt-4 divide-y divide-line border border-line">
          {channels.map((c) => (
            <li key={c.channelId}>
              <button
                type="button"
                onClick={() => void openChannel(c)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-paper-2/50"
              >
                <span className="font-serif text-base">{c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showVideoGrid && !loading && visibleItems.length > 0 && (
        <>
          {showingSamples && (
            <div className="mb-3 mt-5">
              <span className="mono text-[10px] text-ink-soft">{t('source.exampleHint')}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => {
              const selected = isVideoSelected(voices, item.videoId)
              const selectionOrder = voices.find((v) => v.youtubeId === item.videoId)?.n
              return (
                <VideoSourceCard
                  key={item.videoId}
                  item={item}
                  selected={selected}
                  selectionOrder={selected ? selectionOrder : undefined}
                  onToggle={() => {
                    if (item.sample) return
                    onToggleItem(item)
                  }}
                  onOpenYouTube={
                    item.sample
                      ? undefined
                      : () => window.open(item.url ?? `https://www.youtube.com/watch?v=${item.videoId}`, '_blank')
                  }
                />
              )
            })}
          </div>
          {hasMoreVideos && (
            <button
              type="button"
              onClick={() => setShowAllVideos((v) => !v)}
              className="mono-label mt-4 text-[10px] text-ink hover:opacity-60"
            >
              {showAllVideos
                ? t('source.showFewer')
                : t('source.viewAll', { count: gridItems.length })}
            </button>
          )}
        </>
      )}

      {showVideoGrid && !loading && gridItems.length === 0 && !error && (
        <p className="mono mt-6 text-[11px] text-ink-soft">
          {voices.length > 0
            ? t('source.searchOrBrowse')
            : tab === 'search'
              ? t('source.searchOrPaste')
              : t('source.noVideosFound')}
        </p>
      )}
    </div>
  )
}
