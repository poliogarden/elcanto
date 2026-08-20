'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BrandFooter } from '@/components/brand/brand-footer'
import { HomeContinueSection } from '@/components/home/home-continue-section'
import { HomeHero } from '@/components/home/home-hero'
import { Masthead } from '@/components/masthead'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import type { Voice } from '@/lib/types/voice'
import { saveDraft } from '@/lib/storage/synthesis-session'
import {
  focusPresetToMode,
  type SynthesisFocusPreset,
} from '@/lib/types/synthesis-focus'
import {
  reindexVoices,
  toggleVoiceForItem,
  voiceFromSourceItem,
} from '@/lib/voice/source-selection'
import { validateBatchAdd } from '@/lib/voice/batch-add-guard'
import { normalizeDraftVoice } from '@/lib/voice/normalize-voice'
import { loadLocalePreferences } from '@/lib/i18n/storage'
import { resolveResultLanguage } from '@/lib/i18n/resolve'
import { useTranslation } from '@/lib/i18n/locale-context'

export default function HomePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [voices, setVoices] = useState<Voice[]>([])
  const [batchError, setBatchError] = useState<string | null>(null)
  const [focusPreset, setFocusPreset] = useState<SynthesisFocusPreset>('synthesize')
  const [customPrompt, setCustomPrompt] = useState('')

  function handleToggleItem(item: VideoSourceItem) {
    setBatchError(null)
    setVoices((prev) => toggleVoiceForItem(prev, item))
  }

  function handleBatchAdd(items: VideoSourceItem[]) {
    setBatchError(null)
    const check = validateBatchAdd(items, voices)
    if (!check.ok) {
      setBatchError(
        check.code === 'already_selected'
          ? t('source.alreadySelected')
          : t('source.batchMaxPlaylist', { max: check.max ?? 20 }),
      )
      return
    }
    setVoices((prev) => {
      let next = [...prev]
      for (const item of check.items) {
        if (next.some((v) => v.youtubeId === item.videoId)) continue
        next = [...next, voiceFromSourceItem(item, next.length + 1)]
      }
      return reindexVoices(next)
    })
  }

  function handleRemove(id: string) {
    setVoices((prev) => reindexVoices(prev.filter((v) => v.id !== id)))
  }

  const readyVoices = voices.filter((v) => v.status === 'ready' || v.status === 'done')

  function handleSynthesize() {
    const normalized = readyVoices
      .map((v) =>
        normalizeDraftVoice({
          id: v.id,
          n: v.n,
          youtubeId: v.youtubeId,
          url: v.url,
          title: v.title,
          channel: v.channel,
          thumbnail: v.thumbnail,
          duration: v.duration,
          durationSeconds: v.durationSeconds,
        }),
      )
      .filter((v): v is NonNullable<typeof v> => v !== null)

    if (normalized.length < 2) {
      setBatchError(t('errors.needTwoValid'))
      return
    }

    const prefs = loadLocalePreferences()
    const outputLanguage = resolveResultLanguage(prefs.resultLanguage, prefs.interfaceLocale)

    const id = crypto.randomUUID()
    const prompt = customPrompt.trim()
    saveDraft(id, {
      voices: normalized,
      focusPreset,
      mode: focusPresetToMode(focusPreset),
      customPrompt: prompt || undefined,
      outputLanguage,
    })
    router.push(`/synthesize/${id}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <Masthead />
      <HomeHero
        voices={voices}
        readyCount={readyVoices.length}
        batchError={batchError}
        focusPreset={focusPreset}
        customPrompt={customPrompt}
        onToggleItem={handleToggleItem}
        onBatchAdd={handleBatchAdd}
        onRemove={handleRemove}
        onFocusPreset={setFocusPreset}
        onCustomPrompt={setCustomPrompt}
        onSynthesize={handleSynthesize}
      />
      <HomeContinueSection />
      <BrandFooter />
    </main>
  )
}
