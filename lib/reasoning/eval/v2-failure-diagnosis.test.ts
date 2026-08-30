import { describe, it } from 'vitest'
import { loadProjectEnv } from '@/lib/reasoning/eval/load-project-env'
import { loadBlindFixtureMeta, loadBlindFixtureSources } from '@/lib/reasoning/eval/blind-registry'
import { loadBlindGold } from '@/lib/reasoning/eval/load-blind-gold'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'

loadProjectEnv()

const FIXTURES = [
  'blind-divide-fasting-weight',
  'blind-complementary-coral',
  'blind-complex-carbon-pricing',
] as const

describe('v2 failure diagnosis', () => {
  for (const fixtureId of FIXTURES) {
    it(fixtureId, async () => {
      const meta = loadBlindFixtureMeta(fixtureId)
      const sources = loadBlindFixtureSources(fixtureId)
      const gold = loadBlindGold(fixtureId)
      const reasoning = await runReasoningPipeline({
        sources,
        voices: sources.map((s) => ({ channel: s.channel ?? 'Unknown' })),
        userQuestion: meta.question,
        outputLanguage: meta.outputLanguage ?? 'en',
      })
      console.log(
        JSON.stringify({
          fixtureId,
          claims: reasoning.claims.length,
          relationships: reasoning.relationships.map((r) => ({
            type: r.type,
            status: r.verificationStatus,
            from: r.fromClaimId,
            to: r.toClaimId,
            shared: r.sharedProposition?.slice(0, 80),
          })),
          gold: gold.expectedRelationships.map((g) => g.type),
          warnings: reasoning.pipelineWarnings?.slice(0, 5),
        }),
      )
    }, 600000)
  }
})
