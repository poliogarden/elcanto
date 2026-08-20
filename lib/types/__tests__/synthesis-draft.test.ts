import { describe, expect, it } from 'vitest'
import { normalizeSynthesisDraft, resolveDraftQuestion, resolveDraftSynthesisMode } from '@/lib/types/synthesis-draft'

describe('normalizeSynthesisDraft', () => {
  it('wraps legacy voice arrays', () => {
    const draft = normalizeSynthesisDraft([{ id: '1', n: 1, youtubeId: 'a', url: '', title: 'A', channel: 'C', duration: '1:00' }])
    expect(draft?.voices).toHaveLength(1)
  })

  it('reads focus preset and prompt', () => {
    const draft = normalizeSynthesisDraft({
      voices: [],
      focusPreset: 'differences',
      customPrompt: 'What conflicts?',
    })
    expect(draft?.focusPreset).toBe('differences')
    expect(resolveDraftSynthesisMode(draft!)).toBe('debate')
    expect(resolveDraftQuestion(draft!)).toBe('What conflicts?')
  })
})
