const DEFAULT_MODEL = 'gpt-4o-mini'

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

export function getModelForRole(role: 'analysis' | 'synthesis' | 'ask'): string {
  const envKey =
    role === 'analysis'
      ? 'OPENAI_MODEL_ANALYSIS'
      : role === 'synthesis'
        ? 'OPENAI_MODEL_SYNTHESIS'
        : 'OPENAI_MODEL_ASK'

  return requireServerEnv(envKey) ?? DEFAULT_MODEL
}

export const AI_CONFIG = {
  defaultModel: DEFAULT_MODEL,
  /** Max parallel OpenAI calls — tune for rate limits / cost */
  maxConcurrency: 3,
  /** Synthesis engine version — bump to invalidate collection cache */
  synthesisVersion: '1',
} as const
