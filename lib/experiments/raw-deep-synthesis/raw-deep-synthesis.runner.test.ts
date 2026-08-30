import { describe, it, expect } from 'vitest'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import { runRawDeepSynthesisExperiment } from '@/lib/experiments/raw-deep-synthesis/run'

const HAS_KEY = isLiveEvalEnvironmentReady()

describe.runIf(HAS_KEY)('raw deep synthesis experiment', () => {
  it(
    'runs one-shot full-transcript cross-source synthesis',
    async () => {
      const result = await runRawDeepSynthesisExperiment()

      expect(result.apiCalls).toBe(1)
      expect(result.rawOutput.length).toBeGreaterThan(50)
      expect(result.transcripts.length).toBe(3)
      for (const t of result.transcripts) {
        expect(t.characterCount).toBeGreaterThan(100)
        expect(t.segmentCount).toBeGreaterThan(0)
      }

      console.log('\n# RAW DEEP SYNTHESIS EXPERIMENT RESULT\n')
      console.log(`Model: ${result.model}`)
      console.log(`API calls: ${result.apiCalls}`)
      console.log(`Latency: ${result.latencyMs}ms`)
      console.log(`Input tokens: ${result.inputTokens}`)
      console.log(`Output tokens: ${result.outputTokens}`)
      console.log(`Report: ${result.reportPath}`)
      console.log('\n--- RAW OUTPUT ---\n')
      console.log(result.rawOutput)
    },
    600000,
  )
})
