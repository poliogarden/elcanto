'use client'

import type {
  SynthesisProgressEvent,
  SynthesisStreamCompletePayload,
} from '@/lib/synthesis/progress-events'

export type RunSynthesisStreamInput = {
  sources: unknown[]
  failedSources?: unknown[]
  synthesisId?: string
  mode?: string
  question?: string
  outputLanguage?: 'ko' | 'en'
}

export async function consumeSynthesisStream(
  input: RunSynthesisStreamInput,
  onEvent: (event: SynthesisProgressEvent) => void,
): Promise<SynthesisStreamCompletePayload> {
  const res = await fetch('/api/synthesis/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? 'Synthesis stream failed.')
  }

  if (!res.body) {
    throw new Error('Synthesis stream returned no body.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete: SynthesisStreamCompletePayload | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue

      const event = JSON.parse(line.slice(5).trim()) as SynthesisProgressEvent
      onEvent(event)

      if (event.type === 'error') {
        throw new Error(event.message)
      }
      if (event.type === 'complete') {
        complete = event
      }
    }
  }

  if (!complete) {
    throw new Error('Synthesis stream ended without a complete event.')
  }

  return complete
}

export function synthesisStepFromPhase(
  phase: SynthesisProgressEvent & { type: 'phase' },
): number | null {
  if (phase.status !== 'start' && phase.status !== 'complete') return null

  switch (phase.phase) {
    case 'relationship':
    case 'combined_analysis':
      return phase.status === 'start' ? 0 : 1
    case 'emergent_insight':
    case 'fourth_idea':
      return phase.status === 'start' ? 1 : 2
    case 'insight_map':
      return 2
    case 'set_analysis':
      return 1
    default:
      return null
  }
}
