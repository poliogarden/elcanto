import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { pushAIUsageMemory } from '@/lib/ai/usage/memory-store'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function persistAIUsage(record: AIUsageRecord): Promise<void> {
  pushAIUsageMemory(record)

  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase.from('ai_usage').insert({
    id: record.id,
    request_id: record.requestId ?? null,
    user_id: record.userId ?? null,
    synthesis_id: record.synthesisId ?? null,
    youtube_video_id: record.youtubeVideoId ?? null,
    operation: record.operation,
    model: record.model,
    input_tokens: record.inputTokens,
    output_tokens: record.outputTokens,
    cached_input_tokens: record.cachedInputTokens,
    reasoning_tokens: record.reasoningTokens,
    estimated_cost_usd: record.estimatedCostUsd,
    duration_ms: record.durationMs,
    success: record.success,
    retry_count: record.retryCount,
    created_at: record.createdAt,
  })
}
