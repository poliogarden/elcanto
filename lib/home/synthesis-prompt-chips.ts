import type { SynthesisFocusPreset } from '@/lib/types/synthesis-focus'

export type PromptChipId =
  | 'synthesize'
  | 'compare'
  | 'connections'
  | 'disagreements'
  | 'emerges'

export type PromptChipDef = {
  id: PromptChipId
  focusPreset: SynthesisFocusPreset
  labelKey: `workspace.chip.${PromptChipId}`
  promptKey: `workspace.prompt.${PromptChipId}`
}

export const PROMPT_CHIPS: PromptChipDef[] = [
  { id: 'synthesize', focusPreset: 'synthesize', labelKey: 'workspace.chip.synthesize', promptKey: 'workspace.prompt.synthesize' },
  { id: 'compare', focusPreset: 'common', labelKey: 'workspace.chip.compare', promptKey: 'workspace.prompt.compare' },
  { id: 'connections', focusPreset: 'connections', labelKey: 'workspace.chip.connections', promptKey: 'workspace.prompt.connections' },
  { id: 'disagreements', focusPreset: 'differences', labelKey: 'workspace.chip.disagreements', promptKey: 'workspace.prompt.disagreements' },
  { id: 'emerges', focusPreset: 'synthesize', labelKey: 'workspace.chip.emerges', promptKey: 'workspace.prompt.emerges' },
]
