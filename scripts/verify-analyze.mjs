import { analyzeOneSource } from '../lib/pipeline/analyze-source.ts'
import { createSourceId } from '../lib/types/source.ts'

const outcome = await analyzeOneSource({
  sourceId: createSourceId(1),
  videoId: 'jNQXAC9IVRw',
  voiceIndex: 1,
  title: 'Me at the zoo',
  channel: 'jawed',
  url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
})

console.log(
  JSON.stringify({
    ok: outcome.ok,
    claims: outcome.ok ? outcome.analysis.claims.length : 0,
    failureCode: outcome.ok ? null : outcome.failure.code,
    failureMessage: outcome.ok ? null : outcome.failure.message,
  }),
)

process.exit(outcome.ok ? 0 : 1)
