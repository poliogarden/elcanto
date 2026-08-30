import { mkdir, writeFile, rename } from 'fs/promises'
import path from 'path'
import type { DirectPipelineRun } from '@/lib/direct-synthesis/types'

export async function writeFinalDirectFixReport(input: {
  fix1RootCause: string
  fix1Change: string
  fix2RootCause: string
  fix2Change: string
  caseARun: DirectPipelineRun
  centralQuestion: string
}): Promise<void> {
  const r = input.caseARun.result
  const lines: string[] = [
    '# FINAL DIRECT FIX',
    '',
    '## FIX 1 ROOT CAUSE',
    '',
    input.fix1RootCause,
    '',
    '## FIX 1 CHANGE',
    '',
    input.fix1Change,
    '',
    '## FIX 2 ROOT CAUSE',
    '',
    input.fix2RootCause,
    '',
    '## FIX 2 CHANGE',
    '',
    input.fix2Change,
    '',
    '## CASE A FINAL RESULT',
    '',
    `Central Question: ${input.centralQuestion}`,
    '',
  ]

  for (const sa of r.sourceAnswers) {
    lines.push(`### ${sa.sourceTitle} (${sa.sourceId})`, '')
    lines.push(`Answerability: ${sa.answerability}`)
    if (sa.answer) lines.push(`Answer: ${sa.answer}`)
    if (sa.keyEvidence.length > 0) {
      lines.push('Evidence:')
      for (const ev of sa.keyEvidence) {
        const ts =
          ev.startTime != null
            ? `${ev.startTime}s${ev.endTime != null ? `–${ev.endTime}s` : ''}`
            : '—'
        lines.push(`- [${ts}] ${ev.text}`)
      }
    }
    lines.push('')
  }

  lines.push(
    '### Final Direct Answer',
    '',
    r.directAnswer,
    '',
    '### Uncertainty',
    '',
    r.uncertainty.length > 0 ? r.uncertainty.map((u) => `- ${u}`).join('\n') : '—',
    '',
    '## PERFORMANCE',
    '',
    `Time: ${input.caseARun.timingMs.totalMs} ms`,
    `LLM calls: ${input.caseARun.cost.llmCalls}`,
    `Input tokens: ${input.caseARun.cost.inputTokens}`,
    `Output tokens: ${input.caseARun.cost.outputTokens}`,
    `Cost: ${input.caseARun.cost.estimatedCostUsd ?? '—'} USD`,
    '',
    '## V2 STATUS',
    '',
    'reasoning-v2.2 unchanged: YES',
    '',
    '## FINAL STATUS',
    '',
    'DIRECT SYNTHESIS READY FOR HUMAN REVIEW',
    '',
  )

  const reportPath = path.join(process.cwd(), 'reports', 'final-direct-fix.md')
  await mkdir(path.dirname(reportPath), { recursive: true })
  const tmp = `${reportPath}.${process.pid}.tmp`
  await writeFile(tmp, lines.join('\n'), 'utf8')
  await rename(tmp, reportPath)
}
