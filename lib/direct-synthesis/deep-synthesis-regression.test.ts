import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { toPersistedDirectSynthesis } from '@/lib/direct-synthesis/persisted'
import { isDirectSynthesisDocument } from '@/lib/direct-synthesis/persisted'
import { buildProfileSourceAnswers } from '@/lib/direct-synthesis/build-profile-source-answers'
import { detectQuestionMode } from '@/lib/direct-synthesis/question-mode'
import { runDirectSynthesisPipeline } from '@/lib/direct-synthesis/pipeline'
import { isLiveEvalEnvironmentReady } from '@/lib/reasoning/eval/load-project-env'
import { loadCaseInput } from '@/lib/direct-synthesis/job-loader'
import { FINAL_DECISION_CASES } from '@/lib/direct-synthesis/cases'

const SYNTHESIS_QUESTION =
  '이 영상들을 함께 봤을 때만 발견할 수 있는 insight는 무엇인가?'
const HAS_KEY = isLiveEvalEnvironmentReady()

describe('deep synthesis regression (no API)', () => {
  it('profile source answers do not require SourceConcept from LLM', async () => {
    const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
    const answers = buildProfileSourceAnswers({
      sources: loaded.sources,
      centralQuestion: SYNTHESIS_QUESTION,
      questionMode: detectQuestionMode(SYNTHESIS_QUESTION),
    })
    expect(answers.length).toBe(3)
    expect(answers.every((a) => a.answerability === 'CONTEXT_ONLY')).toBe(true)
  })

  it('legacy persisted direct document still loads', () => {
    const legacy = {
      reasoningEngine: 'direct' as const,
      directSynthesis: {
        version: 'direct-experiment-1.0',
        centralQuestion: 'test question',
        directAnswer: 'answer',
        sourceContributions: [],
        sourceAnswers: [],
        agreements: [],
        disagreements: [],
        complementaryViews: [],
        uniqueViews: [],
        insight: null,
        nonComparableSources: [],
        uncertainty: [],
        evidence: [],
        removedUnsupported: {
          agreements: 0,
          disagreements: 0,
          complementaryViews: 0,
          uniqueViews: 0,
          insights: 0,
          insight: 0,
        },
        timingMs: {
          evidenceRetrievalMs: 0,
          perSourceAnswerMs: 0,
          crossSourceMs: 0,
          validationMs: 0,
          finalizeMs: 0,
          totalMs: 0,
        },
      },
    }
    expect(isDirectSynthesisDocument(legacy)).toBe(true)
  })

  it('persisted run includes deep-direct synthesis mode', async () => {
    const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
    // Mock would need API — only check structure from minimal mock run
    const mockRun = {
      version: 'direct-experiment-1.0' as const,
      synthesisMode: 'deep-direct' as const,
      result: {
        centralQuestion: SYNTHESIS_QUESTION,
        questionMode: 'SYNTHESIS_QUESTION' as const,
        directAnswer: 'test',
        sourceAnswers: [],
        sourceContributions: [],
        agreements: [],
        disagreements: [],
        complementaryViews: [],
        uniqueViews: [],
        insights: [],
        insight: null,
        nonComparableSources: [],
        uncertainty: [],
        evidence: [],
        removedUnsupported: {
          agreements: 0,
          disagreements: 0,
          complementaryViews: 0,
          uniqueViews: 0,
          insights: 0,
          insight: 0,
        },
      },
      timingMs: {
        evidenceRetrievalMs: 0,
        perSourceAnswerMs: 0,
        crossSourceMs: 0,
        validationMs: 0,
        finalizeMs: 0,
        totalMs: 0,
      },
      cost: {
        llmCalls: 1,
        inputTokens: 100,
        outputTokens: 50,
        estimatedCostUsd: 0.01,
      },
      deepSynthesisDiagnostics: {
        synthesisModel: 'o3',
        userQuestion: SYNTHESIS_QUESTION,
        sourceCount: 3,
        transcriptCharsPerSource: [],
        totalInputCharacters: 1000,
        contextExceeded: false,
        candidateInsightCount: 0,
        validatedInsightCount: 0,
        removedInsightCount: 0,
        partiallyGroundedCount: 0,
        evidenceCountPerInsight: [],
      },
    }
    const persisted = toPersistedDirectSynthesis(mockRun)
    expect(persisted.synthesisMode).toBe('deep-direct')
    expect(persisted.centralQuestion).toBe(SYNTHESIS_QUESTION)
    expect(persisted.deepSynthesisDiagnostics?.userQuestion).toBe(SYNTHESIS_QUESTION)
    void loaded
  })
})

describe.runIf(HAS_KEY)('deep synthesis live', () => {
  it(
    'propagates user question and uses single deep synthesis LLM call for synthesis question',
    async () => {
      const loaded = await loadCaseInput(FINAL_DECISION_CASES[0])
      const run = await runDirectSynthesisPipeline({
        centralQuestion: SYNTHESIS_QUESTION,
        sources: loaded.sources,
        outputLanguage: 'ko',
      })

      expect(run.synthesisMode).toBe('deep-direct')
      expect(run.result.centralQuestion).toBe(SYNTHESIS_QUESTION)
      expect(run.cost.llmCalls).toBeLessThanOrEqual(1)
      expect(run.result.sourceAnswers.every((s) => s.answerability !== 'DIRECT')).toBe(true)
      expect(run.deepSynthesisDiagnostics?.userQuestion).toBe(SYNTHESIS_QUESTION)

      for (const insight of run.result.insights) {
        expect(insight.sourceIds.length).toBeGreaterThanOrEqual(2)
        for (const sc of insight.sourceConcepts) {
          expect(sc.evidenceRefs.length).toBeGreaterThan(0)
          expect(sc.origin).toBe('SOURCE')
        }
        for (const ev of run.result.evidence) {
          if (insight.evidenceRefs.includes(ev.ref)) {
            expect(ev.evidenceText.length).toBeGreaterThan(0)
          }
        }
      }
    },
    600000,
  )
})

describe.runIf(HAS_KEY)('golden benchmark Thiel Musk Gates', () => {
  const videoIds = ['6ncbLSiOogQ', 'o15OWA0PFds', 'sKeEYFP6tXA']

  function loadCachedSource(videoId: string, index: number) {
    const cachePath = path.join(process.cwd(), `.data/video-analyses/${videoId}.json`)
    if (!existsSync(cachePath)) {
      throw new Error(`Missing cached analysis for ${videoId}`)
    }
    const raw = JSON.parse(readFileSync(cachePath, 'utf8')) as {
      sourceId?: string
      videoId: string
      voiceIndex?: number
      title: string
      summary?: string
      thesis?: string
      topics?: string[]
      claims?: unknown[]
      entities?: unknown[]
      conclusions?: string[]
      implications?: string[]
      evidence?: Array<{
        id: string
        text: string
        timestamp?: number
        endTime?: number
      }>
      stance?: string | null
    }
    return {
      sourceId: raw.sourceId ?? `source_${index}`,
      videoId: raw.videoId ?? videoId,
      voiceIndex: raw.voiceIndex ?? index,
      title: raw.title,
      summary: raw.summary ?? '',
      thesis: raw.thesis ?? '',
      topics: raw.topics ?? [],
      claims: (raw.claims ?? []) as import('@/lib/types/source').SourceAnalysis['claims'],
      entities: (raw.entities ?? []) as import('@/lib/types/source').SourceAnalysis['entities'],
      conclusions: raw.conclusions ?? [],
      implications: raw.implications ?? [],
      evidence: (raw.evidence ?? []).map((e) => ({
        id: e.id,
        text: e.text,
        timestamp: e.timestamp ?? 0,
        endTime: e.endTime,
        segmentId: e.id,
        sourceId: raw.sourceId ?? `source_${index}`,
      })),
      stance: raw.stance ?? null,
    }
  }

  it(
    'runs golden benchmark once through production pipeline',
    async () => {
      const sources = videoIds.map((id, i) => loadCachedSource(id, i + 1))
      const run = await runDirectSynthesisPipeline({
        centralQuestion: SYNTHESIS_QUESTION,
        sources,
        outputLanguage: 'ko',
      })

      expect(run.result.centralQuestion).toBe(SYNTHESIS_QUESTION)
      expect(run.cost.llmCalls).toBe(1)

      const genericPatterns = [
        /innovation and regulation/i,
        /balancing innovation/i,
        /opportunities and risks/i,
      ]

      for (const insight of run.result.insights) {
        const combined = `${insight.title} ${insight.summary}`
        for (const pattern of genericPatterns) {
          expect(combined).not.toMatch(pattern)
        }
        expect(insight.sourceIds.length).toBeGreaterThanOrEqual(2)
        expect(insight.evidenceRefs.length).toBeGreaterThanOrEqual(2)
        for (const sc of insight.sourceConcepts) {
          expect(sc.evidenceRefs.length).toBeGreaterThan(0)
        }
      }

      // Write result for report (test artifact)
      const reportPath = path.join(process.cwd(), 'reports/deep-synthesis-golden-last.json')
      const { writeFileSync } = await import('node:fs')
      writeFileSync(
        reportPath,
        JSON.stringify(
          {
            question: SYNTHESIS_QUESTION,
            run: {
              insights: run.result.insights,
              removed: run.result.removedUnsupported,
              diagnostics: run.deepSynthesisDiagnostics,
              cost: run.cost,
              timingMs: run.timingMs,
            },
          },
          null,
          2,
        ),
      )
    },
    600000,
  )
})
