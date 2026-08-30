import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import {
  createSynthesisJobRecord,
  loadSynthesisJob,
  saveSynthesisJob,
} from '@/lib/synthesis/synthesis-job-repository'
import { runSynthesisJob } from '@/lib/synthesis/synthesis-job-runner'
import { normalizeSynthesisDraft } from '@/lib/types/synthesis-draft'

const HAS_KEY = isLiveEvalEnvironmentReady()

function caseADraft() {
  const metaPath = path.join(
    process.cwd(),
    '.data/synthesis-jobs/90c1d5a2-9e6d-4619-badf-c6f89844c27f/meta.json',
  )
  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as {
    draft: unknown
  }
  const draft = normalizeSynthesisDraft({
    ...meta.draft,
    customPrompt:
      '의사결정에서 53%의 정확도를 달성하는 것이 정말로 뛰어난 능력을 의미하는가?',
  })
  if (!draft) throw new Error('Case A draft invalid')
  return draft
}

describe.runIf(HAS_KEY)('direct production smoke', () => {
  it(
    'runs Case A through production job runner with Direct engine',
    async () => {
      const synthesisId = crypto.randomUUID()
      const job = createSynthesisJobRecord({ synthesisId, draft: caseADraft() })
      await saveSynthesisJob(job)

      await runSynthesisJob(job.id)

      const loaded = await loadSynthesisJob(job.id)
      expect(loaded?.status).toBe('completed')
      const doc = loaded?.document
      expect(doc?.reasoningEngine).toBe('direct')
      expect(doc?.directSynthesis?.directAnswer).toBeTruthy()
      expect(doc?.reasoning).toBeUndefined()
      expect(doc?.productionMeta?.reasoningEngine).toBe('direct')
      expect(doc?.productionMeta?.diagnostics?.funnel.candidatePairs).toBe(0)

      const source1 = doc?.directSynthesis?.sourceAnswers.find((s) => s.sourceId === 'source_1')
      expect(doc?.directSynthesis?.centralQuestion).toContain('53%')
      expect(doc?.userQuestion).toBe(doc?.directSynthesis?.centralQuestion)
      expect(source1?.keyEvidence.some((e) => e.text.includes('53%'))).toBe(true)
      expect(source1?.keyEvidence.some((e) => e.startTime === 22040)).toBe(true)
    },
    600000,
  )
})
