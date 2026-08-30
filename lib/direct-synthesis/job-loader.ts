import { readFile } from 'fs/promises'
import path from 'path'
import { loadBaselineFixture, loadFixtureSources } from '@/lib/reasoning/eval/fixtures'
import { loadSynthesisJobLocal } from '@/lib/synthesis/synthesis-job-store'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SourceAnalysis } from '@/lib/types/source'
import type { FinalDecisionCase } from '@/lib/direct-synthesis/cases'

const JOBS_DIR = path.join(process.cwd(), '.data', 'synthesis-jobs')

export type LoadedCaseInput = {
  case: FinalDecisionCase
  centralQuestion: string
  outputLanguage: 'ko' | 'en'
  sources: SourceAnalysis[]
  document?: SynthesisDocument
  jobId?: string
}

export async function findJobIdBySynthesisId(synthesisId: string): Promise<string | null> {
  const { readdir } = await import('fs/promises')
  try {
    const entries = await readdir(JOBS_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const job = await loadSynthesisJobLocal(entry.name)
      if (job?.synthesisId === synthesisId) return entry.name
    }
  } catch {
    return null
  }
  return null
}

export async function loadCaseInput(caseDef: FinalDecisionCase): Promise<LoadedCaseInput> {
  if (caseDef.synthesisJobId) {
    const job = await loadSynthesisJobLocal(caseDef.synthesisJobId)
    if (!job?.document) {
      throw new Error(`Job ${caseDef.synthesisJobId} not found or missing document`)
    }
    const doc = job.document
    const sources = doc.voices
      .map((v) => v.analysis)
      .filter((a): a is SourceAnalysis => Boolean(a))
    const centralQuestion =
      doc.reasoning?.mode === 'multi'
        ? doc.reasoning.centralQuestion
        : doc.userQuestion ?? doc.topic ?? 'Unknown question'
    const outputLanguage: 'ko' | 'en' =
      job.draft.outputLanguage === 'ko' ? 'ko' : 'en'
    return {
      case: caseDef,
      centralQuestion,
      outputLanguage,
      sources,
      document: doc,
      jobId: caseDef.synthesisJobId,
    }
  }

  if (!caseDef.fixtureId) {
    throw new Error(`Case ${caseDef.slug} has no job or fixture`)
  }
  const fixture = loadBaselineFixture(caseDef.fixtureId)
  const sources = loadFixtureSources(fixture)
  return {
    case: caseDef,
    centralQuestion: fixture.question,
    outputLanguage: fixture.outputLanguage ?? 'en',
    sources,
  }
}

export async function loadJobExtras(jobId: string): Promise<{
  perfSummary?: {
    llmCalls?: number
    inputTokens?: number
    outputTokens?: number
    estimatedCostUsd?: number
    endToEndMs?: number
    totalMs?: number
  }
}> {
  try {
    const raw = await readFile(path.join(JOBS_DIR, jobId, 'extras.json'), 'utf8')
    return JSON.parse(raw) as { perfSummary?: Record<string, unknown> }
  } catch {
    return {}
  }
}
