import { buildSynthesisCostSummary, runWithAIContext } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { FINAL_DECISION_CASES } from '@/lib/direct-synthesis/cases'
import {
  formatDirectMarkdown,
  formatV2Markdown,
  loadDirectRun,
  loadV2Snapshot,
  saveDirectRun,
  saveV2Snapshot,
  writeCaseReports,
  writeSummaryMd,
} from '@/lib/direct-synthesis/compare-store'
import { loadCaseInput, loadJobExtras } from '@/lib/direct-synthesis/job-loader'
import { runDirectSynthesisPipeline } from '@/lib/direct-synthesis/pipeline'
import type { DirectPipelineRun } from '@/lib/direct-synthesis/types'
import {
  buildV2SnapshotFromDocument,
  buildV2SnapshotFromPipeline,
} from '@/lib/direct-synthesis/v2-snapshot'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'

export type FinalDecisionRunResult = {
  slug: string
  label: string
  isRealYouTube: boolean
  v2Markdown: string
  directMarkdown: string
}

export async function runFinalDecisionCaseDirectOnly(slug: string): Promise<DirectPipelineRun> {
  const caseDef = FINAL_DECISION_CASES.find((c) => c.slug === slug)
  if (!caseDef) throw new Error(`Unknown case: ${slug}`)

  const loaded = await loadCaseInput(caseDef)
  const directRun = await runDirectSynthesisPipeline({
    centralQuestion: loaded.centralQuestion,
    sources: loaded.sources,
    outputLanguage: loaded.outputLanguage,
  })

  await saveDirectRun(slug, directRun)
  return directRun
}

export async function runFinalDecisionCase(slug: string): Promise<FinalDecisionRunResult> {
  const caseDef = FINAL_DECISION_CASES.find((c) => c.slug === slug)
  if (!caseDef) throw new Error(`Unknown case: ${slug}`)

  const loaded = await loadCaseInput(caseDef)
  let v2Snapshot

  if (loaded.document && caseDef.synthesisJobId) {
    const extras = await loadJobExtras(caseDef.synthesisJobId)
    v2Snapshot = buildV2SnapshotFromDocument(loaded.document, extras)
    if (!v2Snapshot) {
      throw new Error(`Case ${slug}: document has no multi-source reasoning`)
    }
  } else {
    const costAccumulator: AIUsageRecord[] = []
    const started = Date.now()
    const reasoning = await runWithAIContext({ costAccumulator }, () =>
      runReasoningPipeline({
        sources: loaded.sources,
        voices: loaded.sources.map((s) => ({ channel: s.title })),
        userQuestion: loaded.centralQuestion,
        outputLanguage: loaded.outputLanguage,
      }),
    )
    const totalMs = Date.now() - started
    const costSummary = buildSynthesisCostSummary(costAccumulator, loaded.sources.length)
    v2Snapshot = buildV2SnapshotFromPipeline(reasoning, totalMs, {
      llmCalls: costAccumulator.length,
      inputTokens: costSummary.totalInputTokens,
      outputTokens: costSummary.totalOutputTokens,
      estimatedCostUsd: costSummary.totalEstimatedCostUsd,
    })
  }

  const directRun = await runDirectSynthesisPipeline({
    centralQuestion: loaded.centralQuestion,
    sources: loaded.sources,
    outputLanguage: loaded.outputLanguage,
  })

  await saveV2Snapshot(slug, v2Snapshot)
  await saveDirectRun(slug, directRun)
  await writeCaseReports(slug, v2Snapshot, directRun)

  return {
    slug,
    label: caseDef.label,
    isRealYouTube: caseDef.isRealYouTube,
    v2Markdown: formatV2Markdown(v2Snapshot),
    directMarkdown: formatDirectMarkdown(directRun),
  }
}

export async function runAllFinalDecisionCases(): Promise<FinalDecisionRunResult[]> {
  const results: FinalDecisionRunResult[] = []
  const summaryEntries: Array<{
    slug: string
    label: string
    isRealYouTube: boolean
    v2: NonNullable<Awaited<ReturnType<typeof loadV2Snapshot>>>
    direct: NonNullable<Awaited<ReturnType<typeof loadDirectRun>>>
  }> = []

  for (const caseDef of FINAL_DECISION_CASES) {
    const result = await runFinalDecisionCase(caseDef.slug)
    results.push(result)

    const v2 = await loadV2Snapshot(caseDef.slug)
    const direct = await loadDirectRun(caseDef.slug)
    if (v2 && direct) {
      summaryEntries.push({
        slug: caseDef.slug,
        label: caseDef.label,
        isRealYouTube: caseDef.isRealYouTube,
        v2,
        direct,
      })
    }
  }

  if (summaryEntries.length > 0) {
    await writeSummaryMd(summaryEntries)
  }

  return results
}
