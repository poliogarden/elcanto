'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { BrandFooter } from '@/components/brand/brand-footer'
import { Masthead } from '@/components/masthead'
import { PersonalGraph } from '@/components/personal/personal-graph'
import { PlaylistImport } from '@/components/personal/playlist-import'
import { TasteWindowTabs } from '@/components/personal/taste-window-tabs'
import { YOUTUBE_SCOPES } from '@/lib/youtube/scopes'
import type { PersonalProfile, TasteWindow } from '@/lib/types/personal'

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function defaultTasteByWindow(profile: PersonalProfile) {
  if (profile.tasteByWindow) return profile.tasteByWindow
  return {
    '7d': {
      window: '7d' as const,
      signalCount: profile.signalCount,
      emerging: profile.emerging,
      declining: profile.declining,
      interestShift: profile.interestShift,
    },
    '30d': {
      window: '30d' as const,
      signalCount: profile.signalCount,
      emerging: profile.emerging,
      declining: profile.declining,
      interestShift: profile.interestShift,
    },
    '90d': {
      window: '90d' as const,
      signalCount: profile.signalCount,
      emerging: [],
      declining: [],
      interestShift: null,
    },
    all: {
      window: 'all' as const,
      signalCount: profile.signalCount,
      emerging: [],
      declining: [],
      interestShift: null,
    },
  }
}

export default function PersonalPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<PersonalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [tasteWindow, setTasteWindow] = useState<TasteWindow>('30d')
  const [askQ, setAskQ] = useState('')
  const [askA, setAskA] = useState('')
  const [asking, setAsking] = useState(false)

  const [isAnonymous, setIsAnonymous] = useState(true)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/personal/profile')
      if (res.ok) {
        const data = (await res.json()) as { profile: PersonalProfile; isAnonymous?: boolean }
        setProfile(data.profile)
        setIsAnonymous(data.isAnonymous ?? true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefill = new URLSearchParams(window.location.search).get('ask')
    if (prefill) setAskQ(prefill)
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const tasteByWindow = useMemo(
    () => (profile ? defaultTasteByWindow(profile) : null),
    [profile],
  )
  const activeTaste = tasteByWindow?.[tasteWindow]

  async function connectYouTube() {
    await signIn(
      'google',
      { callbackUrl: '/personal?connected=youtube' },
      { scope: YOUTUBE_SCOPES, access_type: 'offline', prompt: 'consent' },
    )
  }

  async function syncYouTube() {
    setSyncing(true)
    try {
      const res = await fetch('/api/personal/sync', { method: 'POST' })
      const data = (await res.json()) as { profile?: PersonalProfile; error?: string }
      if (data.profile) setProfile(data.profile)
      else if (data.error) alert(data.error)
    } finally {
      setSyncing(false)
    }
  }

  async function disconnectYouTube() {
    if (!confirm('Delete imported YouTube data and disconnect?')) return
    await fetch('/api/personal/youtube', { method: 'DELETE' })
    await loadProfile()
  }

  async function askPersonal() {
    if (!askQ.trim()) return
    setAsking(true)
    try {
      const res = await fetch('/api/personal/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: askQ }),
      })
      const data = (await res.json()) as { answer?: string }
      setAskA(data.answer ?? 'No answer.')
    } finally {
      setAsking(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <Masthead />
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center md:px-8">
          <p className="mono-label text-xs text-ink-soft">Loading your taste profile…</p>
        </div>
        <BrandFooter />
      </main>
    )
  }

  const youtubeConnected = Boolean(profile?.youtubeConnected || session?.user?.youtubeConnected)

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
        <header className="border-b border-line pb-8">
          <span className="mono-label text-xs text-ink-soft">PERSONAL TASTE ENGINE</span>
          <h1 className="mt-2 font-serif text-4xl font-medium md:text-5xl">My Current Mind</h1>
          <p className="mono-label mt-4 text-xs text-ink-soft">
            Used for your private taste analysis. Stored locally in <code>.data/personal/</code>
            {isAnonymous ? ' (no sign-in).' : '.'}
          </p>

          {isAnonymous && (
            <p className="mt-3 font-serif text-base text-ink-soft">
              Run syntheses to build your taste profile. Google sign-in is optional — needed only for
              YouTube sync and playlist import.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!youtubeConnected ? (
              <button
                type="button"
                onClick={() => void connectYouTube()}
                className="mono-label border border-line px-4 py-2 text-[11px] hover:bg-ink hover:text-background"
              >
                Connect YouTube (optional) →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void syncYouTube()}
                  disabled={syncing}
                  className="mono-label border border-line px-4 py-2 text-[11px] hover:bg-ink hover:text-background disabled:opacity-40"
                >
                  {syncing ? 'Syncing…' : 'Sync YouTube →'}
                </button>
                <button
                  type="button"
                  onClick={() => void disconnectYouTube()}
                  className="mono-label border border-line px-4 py-2 text-[11px] text-ink-soft hover:bg-ink hover:text-background"
                >
                  Disconnect YouTube
                </button>
              </>
            )}
            <span className="mono self-center text-[11px] text-ink-soft">
              Last synced: {formatSyncTime(profile?.lastSyncedAt ?? null)} · {profile?.signalCount ?? 0}{' '}
              signals · auto-sync every 6h
            </span>
          </div>
        </header>

        {profile && (
          <>
            <section className="border-b border-line py-10">
              <span className="mono-label text-[10px] text-ink-soft">CURRENT THREAD</span>
              <blockquote className="mt-4 font-serif text-2xl leading-relaxed md:text-3xl">
                {profile.currentThread}
              </blockquote>
              {profile.supportingInterests.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {profile.supportingInterests.map((t) => (
                    <span key={t} className="mono border border-line px-3 py-1 text-[11px]">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="border-b border-line py-10">
              <h2 className="mono-label text-[10px] text-ink-soft">RECENT TASTE</h2>
              <div className="mt-4">
                <TasteWindowTabs
                  value={tasteWindow}
                  onChange={setTasteWindow}
                  signalCounts={
                    tasteByWindow
                      ? {
                          '7d': tasteByWindow['7d'].signalCount,
                          '30d': tasteByWindow['30d'].signalCount,
                          '90d': tasteByWindow['90d'].signalCount,
                          all: tasteByWindow.all.signalCount,
                        }
                      : undefined
                  }
                />
              </div>

              {(activeTaste?.emerging.length ?? 0) > 0 || (activeTaste?.declining.length ?? 0) > 0 ? (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {(activeTaste?.emerging.length ?? 0) > 0 && (
                    <div>
                      <h3 className="mono-label text-[10px] text-ink-soft">EMERGING</h3>
                      <ul className="mt-4 space-y-2">
                        {activeTaste?.emerging.map((e) => (
                          <li key={e.label} className="font-serif text-lg">
                            {e.label}{' '}
                            <span className="mono text-sm text-ink-soft">+{e.changePercent}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(activeTaste?.declining.length ?? 0) > 0 && (
                    <div>
                      <h3 className="mono-label text-[10px] text-ink-soft">DECLINING</h3>
                      <ul className="mt-4 space-y-2">
                        {activeTaste?.declining.map((d) => (
                          <li key={d.label} className="font-serif text-lg">
                            {d.label}{' '}
                            <span className="mono text-sm text-ink-soft">{d.changePercent}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-6 font-serif text-base text-ink-soft">
                  Not enough signals in this window to show trends.
                </p>
              )}

              {activeTaste?.interestShift && (
                <div className="mt-8 border-t border-line pt-8">
                  <h3 className="mono-label text-[10px] text-ink-soft">INTEREST SHIFT</h3>
                  <p className="mt-4 font-serif text-xl leading-relaxed">
                    {activeTaste.interestShift.statement}
                  </p>
                </div>
              )}
            </section>

            <PlaylistImport
              youtubeConnected={youtubeConnected}
              playlists={profile.importedPlaylists ?? []}
              onImported={setProfile}
            />

            {profile.clusters.length > 0 && (
              <section className="border-b border-line py-10">
                <h2 className="mono-label text-[10px] text-ink-soft">RECENT CLUSTERS</h2>
                <p className="mt-6 font-serif text-lg leading-relaxed text-ink-soft">
                  {profile.personalSynthesis}
                </p>
              </section>
            )}

            {profile.inferredPatterns.length > 0 && (
              <section className="border-b border-line py-10">
                <h2 className="mono-label text-[10px] text-ink-soft">A CONNECTION YOU MAY NOT HAVE NOTICED</h2>
                {profile.inferredPatterns.map((p, i) => (
                  <p key={i} className="mt-4 font-serif text-lg leading-relaxed">
                    {p}
                  </p>
                ))}
              </section>
            )}

            {profile.blindSpots.length > 0 && (
              <section className="border-b border-line py-10">
                <h2 className="mono-label text-[10px] text-ink-soft">MISSING FROM YOUR CURRENT SOURCES</h2>
                <div className="mt-4 space-y-4">
                  {profile.blindSpots.map((b) => (
                    <article key={b.id} className="border border-line p-5">
                      <p className="font-serif text-base">
                        <span className="mono-label text-[10px] text-ink-soft">ASSUMED · </span>
                        {b.assumedPerspective}
                      </p>
                      <p className="mt-3 font-serif text-base text-ink-soft">
                        <span className="mono-label text-[10px]">MISSING · </span>
                        {b.missingPerspective}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {profile.gaps.length > 0 && (
              <section className="border-b border-line py-10">
                <h2 className="mono-label text-[10px] text-ink-soft">KNOWLEDGE GAPS</h2>
                {profile.gaps.map((g) => (
                  <article key={g.id} className="mt-4 border border-line p-5">
                    <p className="mono-label text-[10px] text-ink-soft">YOU&apos;VE EXPLORED</p>
                    <p className="mt-2 font-serif text-base">{g.explored}</p>
                    <p className="mono-label mt-4 text-[10px] text-ink-soft">BUT NOT YET</p>
                    <p className="mt-2 font-serif text-lg font-medium">{g.notYetExplored}</p>
                    <p className="mt-2 font-serif text-base text-ink-soft">{g.question}</p>
                  </article>
                ))}
              </section>
            )}

            {profile.recommendations.length > 0 && (
              <section className="border-b border-line py-10">
                <h2 className="mono-label text-[10px] text-ink-soft">WHERE TO GO NEXT</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {profile.recommendations.map((r) => (
                    <article key={r.id} className="border border-line p-5">
                      <span className="mono-label text-[10px] text-ink-soft">{r.typeLabel}</span>
                      <h3 className="mt-2 font-serif text-lg font-medium">{r.title}</h3>
                      <p className="mt-3 font-serif text-sm text-ink-soft">{r.reason}</p>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(r.searchQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono-label mt-4 inline-block text-[11px] hover:opacity-60"
                      >
                        Explore →
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {profile.graphNodes.length > 0 && (
              <section className="border-b border-line py-10">
                <h2 className="mono-label text-[10px] text-ink-soft">MY GRAPH</h2>
                <p className="mt-2 font-serif text-sm text-ink-soft">
                  Select a topic or cluster, then synthesize that interest area.
                </p>
                <div className="mt-6">
                  <PersonalGraph
                    clusters={profile.clusters}
                    graphNodes={profile.graphNodes}
                    graphEdges={profile.graphEdges ?? []}
                  />
                </div>
              </section>
            )}

            <section className="border-t border-line py-10">
              <h2 className="mono-label text-[10px] text-ink-soft">ASK YOUR TASTE</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={askQ}
                  onChange={(e) => setAskQ(e.target.value)}
                  placeholder="What have I been interested in lately?"
                  className="flex-1 border border-line px-4 py-3 font-serif text-base"
                />
                <button
                  type="button"
                  onClick={() => void askPersonal()}
                  disabled={asking}
                  className="mono-label border border-line px-4 py-3 text-[11px] hover:bg-ink hover:text-background disabled:opacity-40"
                >
                  {asking ? '…' : 'Ask →'}
                </button>
              </div>
              {askA && <p className="mt-4 font-serif text-lg leading-relaxed">{askA}</p>}
            </section>
          </>
        )}

        {!profile && !loading && (
          <p className="py-10 font-serif text-lg text-ink-soft">
            Add videos and run a synthesis — your taste profile will build automatically from elcanto
            activity. No sign-in required.
          </p>
        )}
      </div>
      <BrandFooter />
    </main>
  )
}
