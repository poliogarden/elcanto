import { synthesisCollectionKey } from '@/lib/cache/keys'
import { getAIProvider } from '@/lib/ai/openai'
import type { SynthesisResult, VideoAnalysis } from '@/lib/types/analysis'
import { MemoryCache } from '@/lib/cache/memory'
import { createClient } from '@supabase/supabase-js'

const synthesisCache = new MemoryCache<SynthesisResult>(1000 * 60 * 60 * 24)

export type SynthesizeCollectionInput = {
  topic?: string
  analyses: Array<{ voiceIndex: number; youtubeId: string; analysis: VideoAnalysis }>
}

export async function synthesizeCollection(
  input: SynthesizeCollectionInput,
): Promise<SynthesisResult> {
  const videoIds = input.analyses.map((a) => a.youtubeId)
  const cacheKey = synthesisCollectionKey(videoIds)

  const cached = synthesisCache.get(cacheKey)
  if (cached) return cached

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase
      .from('synthesis_results')
      .select('result')
      .eq('collection_hash', cacheKey)
      .maybeSingle()

    if (data?.result) {
      const result = data.result as SynthesisResult
      synthesisCache.set(cacheKey, result)
      return result
    }
  }

  const ai = getAIProvider()
  const result = await ai.synthesizeVideos({
    topic: input.topic,
    analyses: input.analyses.map((a) => ({
      ...a.analysis,
      voiceIndex: a.voiceIndex,
    })),
  })

  synthesisCache.set(cacheKey, result)

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase.from('synthesis_results').upsert({
      collection_hash: cacheKey,
      result,
      cached_at: new Date().toISOString(),
    })
  }

  return result
}
