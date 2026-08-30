import { mkdir, readFile, writeFile, rename } from 'fs/promises'
import path from 'path'
import type { DirectPipelineRun } from '@/lib/direct-synthesis/types'
import type { ComparePreferenceRecord } from '@/lib/direct-synthesis/types'
import type { V2CompareSnapshot } from '@/lib/direct-synthesis/v2-snapshot'

const DATA_DIR = path.join(process.cwd(), '.data', 'final-product-decision')
const REPORTS_DIR = path.join(process.cwd(), 'reports', 'final-product-decision')

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.tmp`
  await writeFile(tmp, contents, 'utf8')
  await rename(tmp, filePath)
}

function caseDir(slug: string): string {
  return path.join(DATA_DIR, slug)
}

export async function saveV2Snapshot(slug: string, snapshot: V2CompareSnapshot): Promise<void> {
  await ensureDataDir()
  await mkdir(caseDir(slug), { recursive: true })
  await atomicWrite(path.join(caseDir(slug), 'v2.json'), JSON.stringify(snapshot, null, 2))
}

export async function loadV2Snapshot(slug: string): Promise<V2CompareSnapshot | null> {
  try {
    const raw = await readFile(path.join(caseDir(slug), 'v2.json'), 'utf8')
    return JSON.parse(raw) as V2CompareSnapshot
  } catch {
    return null
  }
}

export async function saveDirectRun(slug: string, run: DirectPipelineRun): Promise<void> {
  await ensureDataDir()
  await mkdir(caseDir(slug), { recursive: true })
  await atomicWrite(path.join(caseDir(slug), 'direct.json'), JSON.stringify(run, null, 2))
}

export async function loadDirectRun(slug: string): Promise<DirectPipelineRun | null> {
  try {
    const raw = await readFile(path.join(caseDir(slug), 'direct.json'), 'utf8')
    return JSON.parse(raw) as DirectPipelineRun
  } catch {
    return null
  }
}

export async function savePreference(record: ComparePreferenceRecord): Promise<void> {
  await ensureDataDir()
  await mkdir(caseDir(record.caseSlug), { recursive: true })
  await atomicWrite(
    path.join(caseDir(record.caseSlug), 'preference.json'),
    JSON.stringify(record, null, 2),
  )
}

export async function loadPreference(slug: string): Promise<ComparePreferenceRecord | null> {
  try {
    const raw = await readFile(path.join(caseDir(slug), 'preference.json'), 'utf8')
    return JSON.parse(raw) as ComparePreferenceRecord
  } catch {
    return null
  }
}

export function formatV2Markdown(snapshot: V2CompareSnapshot): string {
  const lines: string[] = [
    `# V2.2 Result`,
    '',
    `**Engine:** ${snapshot.engineVersion}`,
    '',
    `**Central question:** ${snapshot.centralQuestion}`,
    '',
    `## Judgment / Display`,
    '',
    snapshot.displayMessage,
    '',
    `**Verified relationships:** ${snapshot.relationshipCount}`,
    '',
  ]

  if (snapshot.agreements.length > 0) {
    lines.push('## Agreement', '')
    for (const a of snapshot.agreements) lines.push(`- ${a}`)
    lines.push('')
  }
  if (snapshot.divides.length > 0) {
    lines.push('## Divide', '')
    for (const d of snapshot.divides) lines.push(`- ${d}`)
    lines.push('')
  }
  if (snapshot.complementary.length > 0) {
    lines.push('## Complementary', '')
    for (const c of snapshot.complementary) lines.push(`- ${c}`)
    lines.push('')
  }

  if (snapshot.pipelineStats) {
    lines.push('## Pipeline funnel', '')
    const ps = snapshot.pipelineStats
    lines.push(
      `- claims extracted: ${ps.claimsExtracted ?? '—'}`,
      `- candidate pairs: ${ps.candidatePairs ?? '—'}`,
      `- verified relationships: ${ps.verifiedRelationships ?? '—'}`,
      `- rejected relationships: ${ps.rejectedRelationships ?? '—'}`,
      '',
    )
  }

  lines.push(
    '## Time / cost',
    '',
    `- time: ${snapshot.timingMs ?? '—'} ms`,
    `- LLM calls: ${snapshot.cost.llmCalls ?? '—'}`,
    `- input tokens: ${snapshot.cost.inputTokens ?? '—'}`,
    `- output tokens: ${snapshot.cost.outputTokens ?? '—'}`,
    `- estimated cost: ${snapshot.cost.estimatedCostUsd ?? '—'} USD`,
    '',
  )

  return lines.join('\n')
}

export function formatDirectMarkdown(run: DirectPipelineRun): string {
  const r = run.result
  const lines: string[] = [
    `# Direct Synthesis Result`,
    '',
    `**Central question:** ${r.centralQuestion}`,
    '',
    '## Direct Answer',
    '',
    r.directAnswer,
    '',
    '## Source Contributions',
    '',
  ]

  for (const sa of r.sourceAnswers) {
    lines.push(`### ${sa.sourceTitle} (${sa.sourceId})`, '')
    lines.push(`- Answerability: ${sa.answerability}`)
    if (sa.answer) lines.push(`- Answer: ${sa.answer}`)
    if (sa.uncertainty) lines.push(`- Uncertainty: ${sa.uncertainty}`)
    if (sa.keyEvidence.length > 0) {
      lines.push('- Key evidence:')
      for (const ev of sa.keyEvidence) {
        const ts =
          ev.startTime != null ? ` [${ev.startTime}s${ev.endTime != null ? `–${ev.endTime}s` : ''}]` : ''
        lines.push(`  -${ts} ${ev.text.slice(0, 200)}`)
      }
    }
    lines.push('')
  }

  if (r.agreements.length > 0) {
    lines.push('## Agreement', '')
    for (const a of r.agreements) {
      lines.push(`- ${a.statement} (sources: ${a.sourceIds.join(', ')})`)
    }
    lines.push('')
  }

  if (r.disagreements.length > 0) {
    lines.push('## Disagreement', '')
    for (const d of r.disagreements) {
      lines.push(`- ${d.statement} (sources: ${d.sourceIds.join(', ')})`)
    }
    lines.push('')
  }

  if (r.complementaryViews.length > 0) {
    lines.push('## Complementary', '')
    for (const c of r.complementaryViews) {
      lines.push(`- ${c.statement} (sources: ${c.sourceIds.join(', ')})`)
    }
    lines.push('')
  }

  if (r.nonComparableSources.length > 0) {
    lines.push('## Cannot Compare', '')
    for (const n of r.nonComparableSources) {
      lines.push(`- ${n.sourceId}: ${n.reason}`)
    }
    lines.push('')
  }

  if (r.uncertainty.length > 0) {
    lines.push('## Uncertainty', '')
    for (const u of r.uncertainty) lines.push(`- ${u}`)
    lines.push('')
  }

  if (r.uniqueViews.length > 0) {
    lines.push('## Unique', '')
    for (const u of r.uniqueViews) {
      lines.push(`- ${u.statement} (sources: ${u.sourceIds.join(', ')})`)
    }
    lines.push('')
  }

  if (r.insight) {
    lines.push('## Insight', '')
    lines.push(`- ${r.insight.statement} (sources: ${r.insight.sourceIds.join(', ')})`)
    lines.push('')
  }

  if (r.removedUnsupported.agreements + r.removedUnsupported.disagreements + r.removedUnsupported.complementaryViews + r.removedUnsupported.uniqueViews + r.removedUnsupported.insight > 0) {
    lines.push(
      '## Validation (removed unsupported)',
      '',
      `- agreements removed: ${r.removedUnsupported.agreements}`,
      `- disagreements removed: ${r.removedUnsupported.disagreements}`,
      `- complementary removed: ${r.removedUnsupported.complementaryViews}`,
      `- unique removed: ${r.removedUnsupported.uniqueViews}`,
      `- insight removed: ${r.removedUnsupported.insight}`,
      '',
    )
  }

  lines.push(
    '## Time / cost',
    '',
    `- total: ${run.timingMs.totalMs} ms`,
    `- LLM calls: ${run.cost.llmCalls}`,
    `- input tokens: ${run.cost.inputTokens}`,
    `- output tokens: ${run.cost.outputTokens}`,
    `- estimated cost: ${run.cost.estimatedCostUsd ?? '—'} USD`,
    '',
  )

  return lines.join('\n')
}

export async function writeCaseReports(slug: string, v2: V2CompareSnapshot, direct: DirectPipelineRun): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true })
  const prefix = slug.replace('case-', 'case-')
  await atomicWrite(path.join(REPORTS_DIR, `${prefix}-v2.md`), formatV2Markdown(v2))
  await atomicWrite(path.join(REPORTS_DIR, `${prefix}-direct.md`), formatDirectMarkdown(direct))
}

export async function writeSummaryMd(entries: Array<{
  slug: string
  label: string
  isRealYouTube: boolean
  v2: V2CompareSnapshot
  direct: DirectPipelineRun
}>): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true })
  const lines: string[] = [
    '# FINAL PRODUCT DECISION EXPERIMENT',
    '',
    'No architecture decision has been automatically made.',
    'Current V2 remains unchanged. Direct path remains experimental.',
    '',
  ]

  for (const e of entries) {
    lines.push(`## ${e.label}`, '')
    lines.push(`- Real YouTube: ${e.isRealYouTube ? 'yes' : 'no (prepared benchmark set)'}`)
    lines.push('')
    lines.push('### V2 result', '')
    lines.push(e.v2.displayMessage.slice(0, 500))
    lines.push('')
    lines.push(
      `V2 time/cost: ${e.v2.timingMs ?? '—'} ms, ${e.v2.cost.estimatedCostUsd ?? '—'} USD`,
    )
    lines.push('')
    lines.push('### Direct result', '')
    lines.push(e.direct.result.directAnswer.slice(0, 500))
    lines.push('')
    lines.push(
      `Direct time/cost: ${e.direct.timingMs.totalMs} ms, ${e.direct.cost.estimatedCostUsd ?? '—'} USD`,
    )
    lines.push('')
  }

  lines.push('## Waiting for Human Decision', '')
  lines.push(
    'Compare at `/dev/direct-compare` and select which result is more useful.',
    '',
  )

  await atomicWrite(path.join(REPORTS_DIR, 'summary.md'), lines.join('\n'))
}
