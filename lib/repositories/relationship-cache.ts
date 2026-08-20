import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { RelationshipGraph } from '@/lib/types/relationship'
import { AI_CONFIG } from '@/lib/ai/config'
import { createHash } from 'crypto'
import { MemoryCache } from '@/lib/cache/memory'
import { logCacheEvent } from '@/lib/ai/cache-log'

const memoryCache = new MemoryCache<RelationshipGraph>(1000 * 60 * 60 * 24)

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export function relationshipCacheHash(sourceIds: string[], analysisVersions: string[]): string {
  const sorted = [...sourceIds].sort()
  const versions = [...analysisVersions].sort().join(',')
  const payload = `rel:v${AI_CONFIG.relationshipEngineVersion}:${AI_CONFIG.synthesisVersion}:${sorted.join(',')}:${versions}`
  return createHash('sha256').update(payload).digest('hex')
}

export async function getCachedRelationshipGraph(
  hash: string,
): Promise<RelationshipGraph | null> {
  const mem = memoryCache.get(hash)
  if (mem) {
    logCacheEvent({ layer: 'RELATIONSHIP', key: hash, result: 'HIT' })
    return mem
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    logCacheEvent({ layer: 'RELATIONSHIP', key: hash, result: 'MISS' })
    return null
  }

  const { data } = await supabase
    .from('relationship_cache')
    .select('graph, engine_version')
    .eq('relationship_hash', hash)
    .maybeSingle()

  if (data?.graph && data.engine_version === AI_CONFIG.relationshipEngineVersion) {
    const graph = data.graph as RelationshipGraph
    memoryCache.set(hash, graph)
    logCacheEvent({ layer: 'RELATIONSHIP', key: hash, result: 'HIT' })
    return graph
  }

  logCacheEvent({ layer: 'RELATIONSHIP', key: hash, result: 'MISS' })
  return null
}

export async function setCachedRelationshipGraph(
  hash: string,
  graph: RelationshipGraph,
): Promise<void> {
  memoryCache.set(hash, graph)

  const supabase = getSupabaseAdmin()
  if (!supabase) return

  await supabase.from('relationship_cache').upsert({
    relationship_hash: hash,
    graph,
    engine_version: AI_CONFIG.relationshipEngineVersion,
    cached_at: new Date().toISOString(),
  })
}
