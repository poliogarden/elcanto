'use client'

import { useState } from 'react'
import type { ImportedPlaylist, PersonalProfile } from '@/lib/types/personal'

type Props = {
  youtubeConnected: boolean
  playlists: ImportedPlaylist[]
  onImported: (profile: PersonalProfile) => void
}

export function PlaylistImport({ youtubeConnected, playlists, onImported }: Props) {
  const [url, setUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    if (!url.trim()) return
    setImporting(true)
    setError('')
    try {
      const res = await fetch('/api/personal/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: url }),
      })
      const data = (await res.json()) as { profile?: PersonalProfile; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Import failed.')
      if (data.profile) onImported(data.profile)
      setUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  if (!youtubeConnected) return null

  return (
    <section className="border-b border-line py-10">
      <h2 className="mono-label text-[10px] text-ink-soft">IMPORT PLAYLIST</h2>
      <p className="mt-2 font-serif text-base text-ink-soft">
        Paste a YouTube playlist URL to add its videos to your taste signals.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/playlist?list=PL..."
          className="flex-1 border border-line px-4 py-3 font-serif text-base"
        />
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={importing}
          className="mono-label border border-line px-4 py-3 text-[11px] hover:bg-ink hover:text-background disabled:opacity-40"
        >
          {importing ? 'Importing…' : 'Import →'}
        </button>
      </div>
      {error && <p className="mt-2 font-serif text-sm text-red-700">{error}</p>}
      {playlists.length > 0 && (
        <ul className="mt-6 space-y-2">
          {playlists.map((p) => (
            <li key={p.playlistId} className="mono text-[11px] text-ink-soft">
              {p.title} · {p.videoCount} videos
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
