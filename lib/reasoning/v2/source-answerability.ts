import type { ClaimAlignmentRecord, ClaimQuestionAlignment } from '@/lib/reasoning/v2/claim-question-alignment'
import type { ReasoningClaim } from '@/lib/reasoning/types'
import type { QuestionIntent } from '@/lib/reasoning/v2/question-intent'

export type SourceAnswerability =
  | 'DIRECTLY_ANSWERABLE'
  | 'PARTIALLY_ANSWERABLE'
  | 'CONTEXT_ONLY'
  | 'NOT_ANSWERABLE'

export type SourceAnswerabilityRecord = {
  sourceId: string
  answerability: SourceAnswerability
  directClaims: number
  supportingClaims: number
  contextualClaims: number
  title?: string
}

export function evaluateSourceAnswerability(input: {
  sources: Array<{ sourceId: string; title?: string }>
  alignments: ClaimAlignmentRecord[]
}): SourceAnswerabilityRecord[] {
  const bySource = new Map<string, ClaimAlignmentRecord[]>()
  for (const a of input.alignments) {
    const list = bySource.get(a.sourceId) ?? []
    list.push(a)
    bySource.set(a.sourceId, list)
  }

  return input.sources.map((s) => {
    const rows = bySource.get(s.sourceId) ?? []
    let direct = 0
    let supporting = 0
    let contextual = 0
    for (const r of rows) {
      if (r.alignment === 'DIRECT') direct++
      else if (r.alignment === 'SUPPORTING') supporting++
      else if (r.alignment === 'CONTEXTUAL') contextual++
    }

    let answerability: SourceAnswerability = 'NOT_ANSWERABLE'
    if (direct >= 1) answerability = 'DIRECTLY_ANSWERABLE'
    else if (supporting >= 2) answerability = 'PARTIALLY_ANSWERABLE'
    else if (supporting >= 1) answerability = 'PARTIALLY_ANSWERABLE'
    else if (contextual >= 1) answerability = 'CONTEXT_ONLY'

    return {
      sourceId: s.sourceId,
      answerability,
      directClaims: direct,
      supportingClaims: supporting,
      contextualClaims: contextual,
      title: s.title,
    }
  })
}

export type CrossSourceAnswerability = {
  directlyAnswerableSources: number
  partiallyAnswerableSources: number
  contextOnlySources: number
  notAnswerableSources: number
  comparableForJudgment: boolean
  summary: string
}

export function evaluateCrossSourceAnswerability(
  records: SourceAnswerabilityRecord[],
): CrossSourceAnswerability {
  let direct = 0
  let partial = 0
  let context = 0
  let none = 0
  for (const r of records) {
    if (r.answerability === 'DIRECTLY_ANSWERABLE') direct++
    else if (r.answerability === 'PARTIALLY_ANSWERABLE') partial++
    else if (r.answerability === 'CONTEXT_ONLY') context++
    else none++
  }

  const comparableForJudgment = direct >= 2 || (direct >= 1 && partial >= 1)

  let summary: string
  if (direct >= 2) {
    summary = 'Multiple sources directly address the central question.'
  } else if (direct === 1 && partial + context > 0) {
    summary =
      'Only one source directly addresses the central question; others provide adjacent context.'
  } else if (direct === 1) {
    summary = 'Only one source directly addresses the central question.'
  } else if (partial >= 2) {
    summary = 'Sources partially relate to the question but lack direct answers.'
  } else {
    summary = 'Sources do not directly answer the central question.'
  }

  return {
    directlyAnswerableSources: direct,
    partiallyAnswerableSources: partial,
    contextOnlySources: context,
    notAnswerableSources: none,
    comparableForJudgment,
    summary,
  }
}

export function countAlignmentBySource(
  alignments: ClaimAlignmentRecord[],
  alignment: ClaimQuestionAlignment,
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const a of alignments) {
    if (a.alignment !== alignment) continue
    map[a.sourceId] = (map[a.sourceId] ?? 0) + 1
  }
  return map
}
