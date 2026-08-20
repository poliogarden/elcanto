const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_COVERAGE_MODEL = 'gpt-4o-mini'

function requireServerEnv(name: string): string | undefined {
  if (typeof window !== 'undefined') {
    throw new Error(`${name} must only be read on the server.`)
  }
  return process.env[name]
}

export function getOpenAIApiKey(): string {
  const key = requireServerEnv('OPENAI_API_KEY')
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }
  return key
}

export type ModelRole = 'coverage' | 'analysis' | 'synthesis' | 'ask'

export function getModelForRole(role: ModelRole): string {
  const envKey =
    role === 'coverage'
      ? 'OPENAI_MODEL_COVERAGE'
      : role === 'analysis'
        ? 'OPENAI_MODEL_ANALYSIS'
        : role === 'synthesis'
          ? 'OPENAI_MODEL_SYNTHESIS'
          : 'OPENAI_MODEL_ASK'

  const value = requireServerEnv(envKey)?.trim()
  if (role === 'coverage') {
    return value || requireServerEnv('OPENAI_MODEL_ANALYSIS')?.trim() || DEFAULT_COVERAGE_MODEL
  }
  return value || DEFAULT_MODEL
}

/** Bump when video analysis prompt/schema changes materially. */
export const ANALYSIS_VERSION = '6'
/** Bump when SourceAnalysis JSON shape changes. */
export const ANALYSIS_SCHEMA_VERSION = '3'
/** Bump when coverage pass prompt/schema changes. */
export const COVERAGE_PROMPT_VERSION = '1'

export const AI_CONFIG = {
  defaultModel: DEFAULT_MODEL,
  maxConcurrency: 3,
  synthesisVersion: '7',
  analysisVersion: ANALYSIS_VERSION,
  analysisSchemaVersion: ANALYSIS_SCHEMA_VERSION,
  coveragePromptVersion: COVERAGE_PROMPT_VERSION,
  relationshipEngineVersion: '3',
  knowledgeExtensionVersion: '2',
  /** Max sections to deep-analyze after full coverage pass */
  maxDeepSections: 5,
  /** Target section duration for hierarchical grouping (seconds) */
  targetSectionDurationSeconds: 300,
  /** Max characters per coverage section before split */
  maxSectionChars: 4500,
  /** Gap between caption segments (seconds) that suggests a topic boundary */
  segmentGapBoundarySeconds: 3,
  /** Max concurrent video analyses during synthesis prep */
  maxAnalyzeConcurrency: Number(process.env.SYNTHESIS_ANALYZE_CONCURRENCY ?? '4') || 4,
  /** Max deep sections per video when SYNTHESIS_FAST=1 */
  fastMaxDeepSections: 2,
} as const

export function isSynthesisFastMode(): boolean {
  return process.env.SYNTHESIS_FAST === '1'
}

export function shouldRetrySynthesisCoverage(): boolean {
  return process.env.SYNTHESIS_COVERAGE_RETRY !== '0'
}

export function maxDeepSectionsForAnalysis(): number {
  return isSynthesisFastMode() ? AI_CONFIG.fastMaxDeepSections : AI_CONFIG.maxDeepSections
}

export function isAnalysisCacheCompatible(stored: {
  analysis_version?: string | null
  schema_version?: string | null
  model_version?: string | null
}): boolean {
  const version = stored.analysis_version ?? stored.model_version
  if (!version) return false
  if (version !== AI_CONFIG.analysisVersion) return false
  if (stored.schema_version && stored.schema_version !== AI_CONFIG.analysisSchemaVersion) {
    return false
  }
  return true
}
