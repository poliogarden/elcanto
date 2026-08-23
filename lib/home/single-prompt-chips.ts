import type { SynthesisFocusPreset } from '@/lib/types/synthesis-focus'

export type SinglePromptChipId = 'summarize' | 'keyPoints' | 'insights'

export type SinglePromptChipDef = {
  id: SinglePromptChipId
  focusPreset: SynthesisFocusPreset
  labelKey: `workspace.singleChip.${SinglePromptChipId}`
  promptKey: `workspace.singlePrompt.${SinglePromptChipId}`
}

export const SINGLE_PROMPT_CHIPS: SinglePromptChipDef[] = [
  {
    id: 'summarize',
    focusPreset: 'synthesize',
    labelKey: 'workspace.singleChip.summarize',
    promptKey: 'workspace.singlePrompt.summarize',
  },
  {
    id: 'keyPoints',
    focusPreset: 'synthesize',
    labelKey: 'workspace.singleChip.keyPoints',
    promptKey: 'workspace.singlePrompt.keyPoints',
  },
  {
    id: 'insights',
    focusPreset: 'synthesize',
    labelKey: 'workspace.singleChip.insights',
    promptKey: 'workspace.singlePrompt.insights',
  },
]
