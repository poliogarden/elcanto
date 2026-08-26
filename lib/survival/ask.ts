import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { retrieveEvidenceForQuestion } from '@/lib/retrieval/evidence-retriever'
import { SurvivalAskSchema } from '@/lib/survival/schemas'
import type { SurvivalAnalysis, SurvivalAskAnswer } from '@/lib/survival/types'
import type { SourceAnalysis } from '@/lib/types/source'

const ASK_SYSTEM = `Answer questions about a cross-video survival analysis.

Format rules:
- answer: one clear sentence
- why: max 3 bullets, short
- supportedBySourceIds: only sources with real support
- evidenceRefs: quote excerpts from claims or retrieved transcript chunks when possible
- Do not invent relationships or claims not in the context.
- If the question cannot be answered from the videos, say so briefly.`

export async function askSurvivalQuestion(input: {
  question: string
  survival: SurvivalAnalysis
  sources: SourceAnalysis[]
}): Promise<SurvivalAskAnswer> {
  const openai = getOpenAIClient()
  const retrieved = await retrieveEvidenceForQuestion(input.question, input.sources)

  const context = {
    synthesis: input.survival.synthesis,
    consensus: input.survival.consensus,
    disagreements: input.survival.disagreements,
    emergentInsights: input.survival.emergentInsights,
    claims: input.survival.claims.map((c) => ({
      claimId: c.claimId,
      sourceId: c.sourceId,
      claim: c.claim,
      evidence: c.evidence.slice(0, 200),
    })),
    relationships: input.survival.verifiedRelationships,
    knowledgeGaps: input.survival.knowledgeGaps,
    retrievedTranscriptChunks: retrieved.map((r) => ({
      sourceId: r.sourceId,
      videoId: r.videoId,
      chunks: r.chunks.map((c) => ({ start: c.start, text: c.text.slice(0, 300) })),
    })),
  }

  const parsed = await callStructured({
    openai,
    role: 'ask',
    operation: 'SURVIVAL_ASK',
    system: ASK_SYSTEM,
    user: `Context:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${input.question}`,
    schema: SurvivalAskSchema,
    schemaName: 'survival_ask',
    maxOutputTokens: 2000,
  })

  const sourceToVideo = new Map(input.sources.map((s) => [s.sourceId, s.videoId]))

  return {
    answer: parsed.answer,
    supportedByVideoIds: parsed.supportedBySourceIds
      .map((sid) => sourceToVideo.get(sid))
      .filter((id): id is string => Boolean(id)),
    why: parsed.why,
    evidenceRefs: parsed.evidenceRefs.map((e) => {
      const claim = input.survival.claims.find((c) => c.claimId === e.claimId)
      return {
        claimId: e.claimId,
        videoId: claim?.videoId ?? '',
        excerpt: e.excerpt,
      }
    }),
  }
}
