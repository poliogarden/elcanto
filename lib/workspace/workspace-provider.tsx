'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { PROMPT_CHIPS, type PromptChipId } from '@/lib/home/synthesis-prompt-chips'
import { SINGLE_PROMPT_CHIPS, type SinglePromptChipId } from '@/lib/home/single-prompt-chips'
import { resolveResultLanguage } from '@/lib/i18n/resolve'
import { useTranslation } from '@/lib/i18n/locale-context'
import { loadLocalePreferences } from '@/lib/i18n/storage'
import { saveDraft } from '@/lib/storage/synthesis-session'
import type { VideoSourceItem } from '@/lib/types/selected-source'
import {
  focusPresetToMode,
  type SynthesisFocusPreset,
} from '@/lib/types/synthesis-focus'
import type { Voice } from '@/lib/types/voice'
import { validateBatchAdd } from '@/lib/voice/batch-add-guard'
import { normalizeDraftVoice } from '@/lib/voice/normalize-voice'
import {
  reindexVoices,
  toggleVoiceForItem,
  voiceFromSourceItem,
} from '@/lib/voice/source-selection'
import {
  clearStoredSelection,
  loadStoredSelection,
  saveStoredSelection,
} from '@/lib/workspace/selection-storage'

type ChipId = PromptChipId | SinglePromptChipId

type WorkspaceContextValue = {
  voices: Voice[]
  readyVoices: Voice[]
  batchError: string | null
  customPrompt: string
  activeChip: ChipId | null
  handleToggleItem: (item: VideoSourceItem) => void
  handleBatchAdd: (items: VideoSourceItem[]) => void
  handleRemove: (id: string) => void
  handleClearAll: () => void
  handleChipSelect: (chipId: ChipId) => void
  handleCustomPrompt: (value: string) => void
  handleRun: () => void
  composerPadding: () => string
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { t } = useTranslation()

  const [voices, setVoices] = useState<Voice[]>([])
  const [batchError, setBatchError] = useState<string | null>(null)
  const [focusPreset, setFocusPreset] = useState<SynthesisFocusPreset>('synthesize')
  const [customPrompt, setCustomPrompt] = useState('')
  const [activeChip, setActiveChip] = useState<ChipId | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = loadStoredSelection()
    if (stored) {
      setVoices(stored.voices)
      setCustomPrompt(stored.customPrompt)
      setActiveChip(stored.activeChip as ChipId | null)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (voices.length === 0 && !customPrompt && !activeChip) {
      clearStoredSelection()
      return
    }
    saveStoredSelection({ voices, customPrompt, activeChip })
  }, [voices, customPrompt, activeChip, hydrated])

  const readyVoices = useMemo(
    () => voices.filter((v) => v.status === 'ready' || v.status === 'done'),
    [voices],
  )

  const handleToggleItem = useCallback((item: VideoSourceItem) => {
    setBatchError(null)
    setVoices((prev) => toggleVoiceForItem(prev, item))
  }, [])

  const handleBatchAdd = useCallback(
    (items: VideoSourceItem[]) => {
      setBatchError(null)
      setVoices((prev) => {
        const check = validateBatchAdd(items, prev)
        if (!check.ok) {
          setBatchError(
            check.code === 'already_selected'
              ? t('source.alreadySelected')
              : t('source.batchMaxPlaylist', { max: check.max ?? 20 }),
          )
          return prev
        }
        let next = [...prev]
        for (const item of check.items) {
          if (next.some((v) => v.youtubeId === item.videoId)) continue
          next = [...next, voiceFromSourceItem(item, next.length + 1)]
        }
        return reindexVoices(next)
      })
    },
    [t],
  )

  const handleRemove = useCallback((id: string) => {
    setVoices((prev) => reindexVoices(prev.filter((v) => v.id !== id)))
  }, [])

  const handleClearAll = useCallback(() => {
    setBatchError(null)
    setActiveChip(null)
    setCustomPrompt('')
    setFocusPreset('synthesize')
    setVoices([])
    clearStoredSelection()
  }, [])

  const startSynthesis = useCallback(
    (overrides?: {
      focusPreset?: SynthesisFocusPreset
      customPrompt?: string
      minVoices?: number
    }) => {
      const preset = overrides?.focusPreset ?? focusPreset
      const prompt = (overrides?.customPrompt ?? customPrompt).trim()
      const minVoices = overrides?.minVoices ?? 1

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

      if (normalized.length < minVoices) {
        setBatchError(
          minVoices >= 2 ? t('errors.needTwoValid') : t('errors.needOneValid'),
        )
        return
      }

      const prefs = loadLocalePreferences()
      const outputLanguage = resolveResultLanguage(prefs.resultLanguage, prefs.interfaceLocale)

      const id = crypto.randomUUID()
      saveDraft(id, {
        voices: normalized,
        focusPreset: preset,
        mode: focusPresetToMode(preset),
        customPrompt: prompt || undefined,
        outputLanguage,
      })
      router.push(`/synthesize/${id}`)
    },
    [focusPreset, customPrompt, readyVoices, router, t],
  )

  const handleChipSelect = useCallback(
    (chipId: ChipId) => {
      const multi = PROMPT_CHIPS.find((c) => c.id === chipId)
      const single = SINGLE_PROMPT_CHIPS.find((c) => c.id === chipId)
      const chip = multi ?? single
      if (!chip) return

      const prompt = t(chip.promptKey)
      setFocusPreset(chip.focusPreset)
      setActiveChip(chipId)
      setCustomPrompt(prompt)

      const min = readyVoices.length >= 2 ? 2 : 1
      if (readyVoices.length >= min) {
        startSynthesis({ focusPreset: chip.focusPreset, customPrompt: prompt, minVoices: min })
      }
    },
    [readyVoices.length, startSynthesis, t],
  )

  const handleCustomPrompt = useCallback(
    (value: string) => {
      setCustomPrompt(value)
      if (!activeChip) return

      const multi = PROMPT_CHIPS.find((c) => c.id === activeChip)
      const single = SINGLE_PROMPT_CHIPS.find((c) => c.id === activeChip)
      const chip = multi ?? single
      if (chip && value.trim() !== t(chip.promptKey).trim()) {
        setActiveChip(null)
      }
    },
    [activeChip, t],
  )

  const handleRun = useCallback(() => {
    const min = readyVoices.length >= 2 ? 2 : 1
    startSynthesis({ minVoices: min })
  }, [readyVoices.length, startSynthesis])

  const composerPadding = useCallback(() => {
    if (voices.length >= 1) return 'pb-44 sm:pb-40'
    return ''
  }, [voices.length])

  const value = useMemo(
    () => ({
      voices,
      readyVoices,
      batchError,
      customPrompt,
      activeChip,
      handleToggleItem,
      handleBatchAdd,
      handleRemove,
      handleClearAll,
      handleChipSelect,
      handleCustomPrompt,
      handleRun,
      composerPadding,
    }),
    [
      voices,
      readyVoices,
      batchError,
      customPrompt,
      activeChip,
      handleToggleItem,
      handleBatchAdd,
      handleRemove,
      handleClearAll,
      handleChipSelect,
      handleCustomPrompt,
      handleRun,
      composerPadding,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

/** @deprecated Use useWorkspace */
export function useSynthesisWorkspace(): WorkspaceContextValue {
  return useWorkspace()
}
