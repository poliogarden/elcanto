import { getAnalysisVersionsFromSources } from '@/lib/ai/compact-prompt'
import { getAIProvider } from '@/lib/ai/openai'
import {
  getCachedKnowledgeExtension,
  knowledgeExtensionCacheHash,
  setCachedKnowledgeExtension,
} from '@/lib/repositories/knowledge-extension-cache'
import type { KnowledgeExtension } from '@/lib/types/knowledge'
import type { SetAnalysis } from '@/lib/types/knowledge'
import type { SynthesisResult } from '@/lib/types/analysis'
import type { SourceAnalysis } from '@/lib/types/source'

export async function runKnowledgeExtension(
  sources: SourceAnalysis[],
  setAnalysis: SetAnalysis,
  synthesis: SynthesisResult,
): Promise<KnowledgeExtension> {
  const sourceIds = sources.map((s) => s.sourceId)
  const analysisVersions = getAnalysisVersionsFromSources(sources)
  const cacheKey = knowledgeExtensionCacheHash(sourceIds, analysisVersions)

  const cached = await getCachedKnowledgeExtension(cacheKey)
  if (cached) return cached

  const ai = getAIProvider()
  const extension = await ai.runKnowledgeExtension({
    sources,
    setAnalysis,
    synthesis,
  })

  await setCachedKnowledgeExtension(cacheKey, extension)
  return extension
}
