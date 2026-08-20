/** Per-1M-token pricing (USD). Update when OpenAI pricing changes. */
const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number; cachedInputPer1M?: number }
> = {
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6, cachedInputPer1M: 0.075 },
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10, cachedInputPer1M: 1.25 },
  'gpt-4.1-mini': { inputPer1M: 0.4, outputPer1M: 1.6, cachedInputPer1M: 0.1 },
  'gpt-4.1': { inputPer1M: 2, outputPer1M: 8, cachedInputPer1M: 0.5 },
}

function normalizeModelKey(model: string): string {
  return model.replace(/^openai\//, '').split(':')[0].trim()
}

export function calculateEstimatedCost(input: {
  model: string
  inputTokens: number | null
  outputTokens: number | null
  cachedInputTokens?: number | null
}): number | null {
  const key = normalizeModelKey(input.model)
  const pricing = MODEL_PRICING[key]
  if (!pricing) return null

  const inputTokens = input.inputTokens ?? 0
  const outputTokens = input.outputTokens ?? 0
  const cached = input.cachedInputTokens ?? 0
  const uncachedInput = Math.max(0, inputTokens - cached)

  const inputCost =
    (uncachedInput / 1_000_000) * pricing.inputPer1M +
    (cached / 1_000_000) * (pricing.cachedInputPer1M ?? pricing.inputPer1M)
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000
}

export function getKnownPricingModels(): string[] {
  return Object.keys(MODEL_PRICING)
}
