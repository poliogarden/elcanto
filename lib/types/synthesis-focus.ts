import type { SynthesisMode } from '@/lib/types/synthesis-mode'
import { DEFAULT_SYNTHESIS_MODE } from '@/lib/types/synthesis-mode'

export type SynthesisFocusPreset = 'synthesize' | 'differences' | 'connections' | 'common'

export type SynthesisFocusOption = {
  id: SynthesisFocusPreset
  label: string
  mode: SynthesisMode
  blurb: string
}

export const SYNTHESIS_FOCUS_OPTIONS: SynthesisFocusOption[] = [
  {
    id: 'synthesize',
    label: 'Just synthesize',
    mode: 'discover',
    blurb: 'Read across everything — agreements, differences, and what emerges.',
  },
  {
    id: 'differences',
    label: 'Differences',
    mode: 'debate',
    blurb: 'Focus on disagreement, contradiction, and contrasting assumptions.',
  },
  {
    id: 'connections',
    label: 'Hidden connections',
    mode: 'discover',
    blurb: 'Focus on cross-voice relationships visible only when read together.',
  },
  {
    id: 'common',
    label: 'Common ground',
    mode: 'compare',
    blurb: 'Focus on shared claims and recurring ideas.',
  },
]

export function focusPresetToMode(preset: SynthesisFocusPreset): SynthesisMode {
  return SYNTHESIS_FOCUS_OPTIONS.find((o) => o.id === preset)?.mode ?? DEFAULT_SYNTHESIS_MODE
}

export function parseSynthesisFocusPreset(value: unknown): SynthesisFocusPreset {
  if (value === 'synthesize' || value === 'differences' || value === 'connections' || value === 'common') {
    return value
  }
  return 'synthesize'
}
