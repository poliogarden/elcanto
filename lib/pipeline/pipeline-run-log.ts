export function createPipelineRunId(): string {
  return crypto.randomUUID().slice(0, 8)
}

export function logPipeline(runId: string, message: string, extra?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return
  const suffix = extra ? ` ${JSON.stringify(extra)}` : ''
  console.log(`[PIPELINE ${runId}] ${message}${suffix}`)
}
