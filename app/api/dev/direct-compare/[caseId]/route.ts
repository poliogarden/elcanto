import { NextResponse } from 'next/server'
import { findFinalDecisionCase } from '@/lib/direct-synthesis/cases'
import {
  loadDirectRun,
  loadPreference,
  loadV2Snapshot,
  saveDirectRun,
  savePreference,
  saveV2Snapshot,
} from '@/lib/direct-synthesis/compare-store'
import { loadCaseInput, loadJobExtras } from '@/lib/direct-synthesis/job-loader'
import { runDirectSynthesisPipeline } from '@/lib/direct-synthesis/pipeline'
import { runFinalDecisionCase } from '@/lib/direct-synthesis/run-cases'
import {
  buildV2SnapshotFromDocument,
  buildV2SnapshotFromPipeline,
} from '@/lib/direct-synthesis/v2-snapshot'
import type { HumanComparePreference } from '@/lib/direct-synthesis/types'
import { isDirectSynthesisExperimentAllowed } from '@/lib/production/dev-access'
import { buildSynthesisCostSummary, runWithAIContext } from '@/lib/ai/usage/context'
import type { AIUsageRecord } from '@/lib/ai/usage/types'
import { runReasoningPipeline } from '@/lib/reasoning/pipeline'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ caseId: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  if (!isDirectSynthesisExperimentAllowed()) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 404 })
  }

  const { caseId } = await params
  const caseDef = findFinalDecisionCase(caseId)
  if (!caseDef) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  let v2 = await loadV2Snapshot(caseDef.slug)
  const direct = await loadDirectRun(caseDef.slug)
  const preference = await loadPreference(caseDef.slug)

  let centralQuestion: string | undefined
  try {
    const loaded = await loadCaseInput(caseDef)
    centralQuestion = loaded.centralQuestion
    if (!v2 && loaded.document && caseDef.synthesisJobId) {
      const extras = await loadJobExtras(caseDef.synthesisJobId)
      const snapshot = buildV2SnapshotFromDocument(loaded.document, extras)
      if (snapshot) {
        v2 = snapshot
        await saveV2Snapshot(caseDef.slug, snapshot)
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    case: caseDef,
    centralQuestion,
    v2,
    direct,
    preference,
  })
}

export async function POST(request: Request, { params }: RouteParams) {
  if (!isDirectSynthesisExperimentAllowed()) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 404 })
  }

  const { caseId } = await params
  const caseDef = findFinalDecisionCase(caseId)
  if (!caseDef) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const body = (await request.json()) as {
    action?: 'run_direct' | 'run_v2' | 'run_all' | 'save_preference'
    preference?: HumanComparePreference
    note?: string
  }

  if (body.action === 'save_preference') {
    if (!body.preference) {
      return NextResponse.json({ error: 'preference required' }, { status: 400 })
    }
    const record = await savePreference({
      caseSlug: caseDef.slug,
      preference: body.preference,
      note: body.note,
      updatedAt: new Date().toISOString(),
    })
    return NextResponse.json({ preference: record })
  }

  if (body.action === 'run_all') {
    await runFinalDecisionCase(caseDef.slug)
    const v2 = await loadV2Snapshot(caseDef.slug)
    const direct = await loadDirectRun(caseDef.slug)
    return NextResponse.json({ v2, direct })
  }

  if (body.action === 'run_v2') {
    const loaded = await loadCaseInput(caseDef)
    if (loaded.document && caseDef.synthesisJobId) {
      const extras = await loadJobExtras(caseDef.synthesisJobId)
      const snapshot = buildV2SnapshotFromDocument(loaded.document, extras)
      if (!snapshot) {
        return NextResponse.json({ error: 'No V2 reasoning in document' }, { status: 400 })
      }
      await saveV2Snapshot(caseDef.slug, snapshot)
      return NextResponse.json({ v2: snapshot })
    }

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
    const snapshot = buildV2SnapshotFromPipeline(reasoning, totalMs, {
      llmCalls: costAccumulator.length,
      inputTokens: costSummary.totalInputTokens,
      outputTokens: costSummary.totalOutputTokens,
      estimatedCostUsd: costSummary.totalEstimatedCostUsd,
    })
    await saveV2Snapshot(caseDef.slug, snapshot)
    return NextResponse.json({ v2: snapshot })
  }

  if (body.action === 'run_direct') {
    const loaded = await loadCaseInput(caseDef)
    const directRun = await runDirectSynthesisPipeline({
      centralQuestion: loaded.centralQuestion,
      sources: loaded.sources,
      outputLanguage: loaded.outputLanguage,
    })
    await saveDirectRun(caseDef.slug, directRun)
    return NextResponse.json({ direct: directRun })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
