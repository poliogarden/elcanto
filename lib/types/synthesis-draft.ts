import type { DraftVoiceInput } from '@/lib/types/synthesis-document'
import type { SynthesisMode } from '@/lib/types/synthesis-mode'
import { DEFAULT_SYNTHESIS_MODE } from '@/lib/types/synthesis-mode'
import type { ResolvedOutputLanguage } from '@/lib/i18n/types'
import {
  focusPresetToMode,
  parseSynthesisFocusPreset,
  type SynthesisFocusPreset,
} from '@/lib/types/synthesis-focus'

export type SynthesisDraft = {
  voices: DraftVoiceInput[]
  focusPreset?: SynthesisFocusPreset
  mode?: SynthesisMode
  customPrompt?: string
  /** Resolved at synthesis start — frozen for this job */
  outputLanguage?: ResolvedOutputLanguage
}

export function resolveDraftSynthesisMode(draft: SynthesisDraft): SynthesisMode {
  if (draft.mode) return draft.mode
  if (draft.focusPreset) return focusPresetToMode(draft.focusPreset)
  return DEFAULT_SYNTHESIS_MODE
}

export function resolveDraftQuestion(draft: SynthesisDraft): string | undefined {
  const prompt = draft.customPrompt?.trim()
  return prompt || undefined
}

export function normalizeSynthesisDraft(raw: unknown): SynthesisDraft | null {
  if (!raw) return null

  if (Array.isArray(raw)) {
    return { voices: raw as DraftVoiceInput[] }
  }

  if (typeof raw === 'object' && raw !== null && 'voices' in raw) {
    const obj = raw as Partial<SynthesisDraft>
    if (!Array.isArray(obj.voices)) return null
    return {
      voices: obj.voices,
      focusPreset: obj.focusPreset ? parseSynthesisFocusPreset(obj.focusPreset) : undefined,
      mode: obj.mode,
      customPrompt: typeof obj.customPrompt === 'string' ? obj.customPrompt : undefined,
      outputLanguage:
        obj.outputLanguage === 'ko' || obj.outputLanguage === 'en'
          ? obj.outputLanguage
          : undefined,
    }
  }

  return null
}
