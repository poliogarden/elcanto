export type ReasoningEngine = 'direct' | 'legacy-v2'

/** Production default — new synthesis jobs use Direct Synthesis. */
export const DEFAULT_REASONING_ENGINE: ReasoningEngine = 'direct'

export const DIRECT_SYNTHESIS_ENGINE_VERSION = 'deep-direct-1.0'

export function resolveProductionReasoningEngine(
  envValue?: string,
): ReasoningEngine {
  if (envValue === 'legacy-v2') return 'legacy-v2'
  return DEFAULT_REASONING_ENGINE
}
