import type { AIOperation } from '@/lib/ai/usage/types'

export type LLMCallProfile = {
  stage: AIOperation
  model: string
  reasoningEffort: string | null
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  maxOutputTokens: number | null
  promptCharacterLength: number
  systemCharacterLength: number
  contextObjectSize: number | null
  estimatedInputTokensFromChars: number
  requestStart: string
  firstTokenTime: string | null
  requestEnd: string
  durationMs: number
  retryCount: number
  timeoutCount: number
  jsonRepairCount: number
  success: boolean
}

export function estimateTokensFromChars(chars: number): number {
  return Math.ceil(chars / 4)
}

export function logLLMCallProfile(profile: LLMCallProfile): void {
  if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return

  console.log('[LLM CALL PROFILE]')
  console.log(`  stage=${profile.stage}`)
  console.log(`  model=${profile.model}`)
  console.log(`  reasoning_effort=${profile.reasoningEffort ?? 'default'}`)
  console.log(`  input_tokens=${profile.inputTokens ?? '?'} cached_input_tokens=${profile.cachedInputTokens ?? 0}`)
  console.log(`  output_tokens=${profile.outputTokens ?? '?'} reasoning_tokens=${profile.reasoningTokens ?? 0}`)
  console.log(`  max_output_tokens=${profile.maxOutputTokens ?? 'default'}`)
  console.log(`  prompt_character_length=${profile.promptCharacterLength}`)
  console.log(`  system_character_length=${profile.systemCharacterLength}`)
  console.log(`  context_object_size=${profile.contextObjectSize ?? 'n/a'}`)
  console.log(`  estimated_input_tokens_from_chars=${profile.estimatedInputTokensFromChars}`)
  console.log(`  request_start=${profile.requestStart}`)
  console.log(`  first_token_time=${profile.firstTokenTime ?? 'n/a (non-streaming)'}`)
  console.log(`  request_end=${profile.requestEnd}`)
  console.log(`  duration_ms=${profile.durationMs}`)
  console.log(`  retry_count=${profile.retryCount}`)
  console.log(`  timeout_count=${profile.timeoutCount}`)
  console.log(`  json_repair_count=${profile.jsonRepairCount}`)
  console.log(`  success=${profile.success}`)
}

export function logPromptPayloadAnalysis(input: {
  stage: AIOperation
  system: string
  user: string
  contextObjectSize?: number
}): void {
  if (process.env.NODE_ENV === 'production' && process.env.AI_COST_DEBUG !== '1') return

  const totalChars = input.system.length + input.user.length
  console.log('[PROMPT PAYLOAD]')
  console.log(`  stage=${input.stage}`)
  console.log(`  system_chars=${input.system.length}`)
  console.log(`  user_chars=${input.user.length}`)
  console.log(`  total_chars=${totalChars}`)
  console.log(`  estimated_tokens≈${estimateTokensFromChars(totalChars)}`)
  if (input.contextObjectSize != null) {
    console.log(`  context_object_bytes=${input.contextObjectSize}`)
  }
}
