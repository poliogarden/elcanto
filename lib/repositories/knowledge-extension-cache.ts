import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { KnowledgeExtension } from '@/lib/types/knowledge'
import { AI_CONFIG } from '@/lib/ai/config'
import { createHash } from 'crypto'
import { MemoryCache } from '@/lib/cache/memory'
import { logCacheEvent } from '@/lib/ai/cache-log'

const memoryCache = new MemoryCache<KnowledgeExtension>(1000 * 60 * 60 * 24)

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export function knowledgeExtensionCacheHash(
  sourceIds: string[],
  analysisVersions: string[],
): string {
  const sorted = [...sourceIds].sort()
  const versions = [...analysisVersions].sort().join(',')
  const payload = `ext:v${AI_CONFIG.knowledgeExtensionVersion}:${AI_CONFIG.synthesisVersion}:${sorted.join(',')}:${versions}`
  return createHash('sha256').update(payload).digest('hex')
}

export async function getCachedKnowledgeExtension(
  hash: string,
): Promise<KnowledgeExtension | null> {
  const mem = memoryCache.get(hash)
  if (mem) {
    logCacheEvent({ layer: 'KNOWLEDGE_EXTENSION', key: hash, result: 'HIT' })
    return mem
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    logCacheEvent({ layer: 'KNOWLEDGE_EXTENSION', key: hash, result: 'MISS' })
    return null
  }

  const { data } = await supabase
    .from('knowledge_extension_cache')
    .select('extension, engine_version')
    .eq('extension_hash', hash)
    .maybeSingle()

  if (data?.extension && data.engine_version === AI_CONFIG.knowledgeExtensionVersion) {
    const extension = data.extension as KnowledgeExtension
    memoryCache.set(hash, extension)
    logCacheEvent({ layer: 'KNOWLEDGE_EXTENSION', key: hash, result: 'HIT' })
    return extension
  }

  logCacheEvent({ layer: 'KNOWLEDGE_EXTENSION', key: hash, result: 'MISS' })
  return null
}

export async function setCachedKnowledgeExtension(
  hash: string,
  extension: KnowledgeExtension,
): Promise<void> {
  memoryCache.set(hash, extension)

  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase.from('knowledge_extension_cache').upsert({
    extension_hash: hash,
    extension,
    engine_version: AI_CONFIG.knowledgeExtensionVersion,
    cached_at: new Date().toISOString(),
  })
}
