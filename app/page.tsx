'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Hero } from '@/components/hero'
import { IssueNavigation } from '@/components/issue-navigation'
import { Masthead } from '@/components/masthead'
import { SynthesizeCTA } from '@/components/synthesize-cta'
import { VoiceIndex } from '@/components/voice-index'
import { YouTubeInput } from '@/components/youtube-input'
import type { Voice } from '@/lib/types/voice'
import { saveDraft } from '@/lib/storage/synthesis-session'
import { formatTotalDuration } from '@/lib/youtube/url'

function createVoiceId(): string {
  return crypto.randomUUID()
}

export default function HomePage() {
  const router = useRouter()
  const [voices, setVoices] = useState<Voice[]>([])

  async function handleAdd(url: string) {
    const res = await fetch('/api/youtube/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    const data = (await res.json()) as {
      error?: string
      youtubeId?: string
      url?: string
      title?: string
      channel?: string
      thumbnail?: string
      duration?: string
      durationSeconds?: number
    }

    if (!res.ok) {
      throw new Error(data.error ?? 'Could not fetch video metadata.')
    }

    if (!data.youtubeId || !data.url || !data.title) {
      throw new Error('Invalid metadata response.')
    }

    const duplicate = voices.some((v) => v.youtubeId === data.youtubeId)
    if (duplicate) {
      throw new Error('This video is already on the desk.')
    }

    const nextN = voices.length + 1
    const voice: Voice = {
      id: createVoiceId(),
      n: nextN,
      youtubeId: data.youtubeId,
      url: data.url,
      title: data.title,
      channel: data.channel ?? 'Unknown channel',
      thumbnail: data.thumbnail,
      duration: data.duration ?? '—',
      durationSeconds: data.durationSeconds,
      status: 'ready',
    }

    setVoices((prev) => [...prev, voice])
  }

  function handleRemove(id: string) {
    setVoices((prev) =>
      prev
        .filter((v) => v.id !== id)
        .map((v, i) => ({ ...v, n: i + 1 })),
    )
  }

  const readyVoices = voices.filter((v) => v.status === 'ready' || v.status === 'done')
  const total = useMemo(() => formatTotalDuration(readyVoices), [readyVoices])

  function handleSynthesize() {
    const id = crypto.randomUUID()
    saveDraft(
      id,
      readyVoices.map((v) => ({
        id: v.id,
        n: v.n,
        youtubeId: v.youtubeId,
        url: v.url,
        title: v.title,
        channel: v.channel,
        thumbnail: v.thumbnail,
        duration: v.duration,
        durationSeconds: v.durationSeconds,
      })),
    )
    router.push(`/synthesize/${id}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <IssueNavigation issue="NEW SYNTHESIS" active="youtube" />
      <Hero />
      <YouTubeInput count={voices.length} onAdd={handleAdd} />
      <VoiceIndex voices={voices} onRemove={handleRemove} />
      <SynthesizeCTA
        count={readyVoices.length}
        totalDuration={total}
        onSynthesize={handleSynthesize}
      />
    </main>
  )
}
