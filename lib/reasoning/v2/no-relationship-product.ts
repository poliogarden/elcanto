import type { SourceAnswerabilityRecord } from '@/lib/reasoning/v2/source-answerability'
import type { CrossSourceAnswerability } from '@/lib/reasoning/v2/source-answerability'
import type { QuestionIntent } from '@/lib/reasoning/v2/question-intent'

export type NoRelationshipReason =
  | 'NO_SHARED_QUESTION'
  | 'INSUFFICIENT_COMPARABLE_CLAIMS'
  | 'SOURCES_ADDRESS_DIFFERENT_DIMENSIONS'
  | 'INSUFFICIENT_EVIDENCE'
  | 'VERIFICATION_REJECTED'
  | 'CANDIDATE_QUALITY_FILTERED'

export type NoRelationshipProductMessage = {
  reason: NoRelationshipReason
  headline: string
  body: string
  sourceSummaries: string[]
  isGoodZero: boolean
}

export function classifyNoRelationshipReason(input: {
  crossSource: CrossSourceAnswerability
  candidateCount: number
  verifiedCount: number
  preFilterCandidateCount?: number
}): NoRelationshipReason {
  if (!input.crossSource.comparableForJudgment) {
    if (input.crossSource.directlyAnswerableSources <= 1) return 'NO_SHARED_QUESTION'
    return 'SOURCES_ADDRESS_DIFFERENT_DIMENSIONS'
  }
  if (input.preFilterCandidateCount != null && input.preFilterCandidateCount === 0) {
    return 'INSUFFICIENT_COMPARABLE_CLAIMS'
  }
  if (input.candidateCount === 0) return 'CANDIDATE_QUALITY_FILTERED'
  if (input.verifiedCount === 0 && input.candidateCount > 0) return 'VERIFICATION_REJECTED'
  return 'INSUFFICIENT_EVIDENCE'
}

export function buildNoRelationshipProductMessage(input: {
  intent: QuestionIntent
  sourceAnswerability: SourceAnswerabilityRecord[]
  crossSource: CrossSourceAnswerability
  reason: NoRelationshipReason
  outputLanguage?: 'ko' | 'en'
}): NoRelationshipProductMessage {
  const ko = input.outputLanguage === 'ko'
  const sourceSummaries = input.sourceAnswerability.map((s) => {
    const label = s.title ?? s.sourceId
    const mode =
      s.answerability === 'DIRECTLY_ANSWERABLE'
        ? ko
          ? '중심 질문에 직접 답함'
          : 'directly addresses the central question'
        : s.answerability === 'PARTIALLY_ANSWERABLE'
          ? ko
            ? '부분적으로 관련'
            : 'partially related'
          : s.answerability === 'CONTEXT_ONLY'
            ? ko
              ? '같은 주제 맥락만 제공'
              : 'adjacent topic context only'
            : ko
              ? '중심 질문과 무관'
              : 'does not address the central question'
    return `${label}: ${mode}`
  })

  const isGoodZero =
    input.reason === 'NO_SHARED_QUESTION' ||
    input.reason === 'SOURCES_ADDRESS_DIFFERENT_DIMENSIONS' ||
    input.reason === 'CANDIDATE_QUALITY_FILTERED' ||
    (input.reason === 'VERIFICATION_REJECTED' && !input.crossSource.comparableForJudgment)

  let headline: string
  let body: string

  if (ko) {
    headline = '이 영상들은 같은 질문에 답하고 있지 않습니다'
    body = `중심 질문: ${input.intent.rawQuestion}\n\n${input.crossSource.summary}\n\n`
    body += sourceSummaries.map((s) => `· ${s}`).join('\n')
    body +=
      '\n\n따라서 이 영상들 사이에서 신뢰할 수 있는 합의·충돌·보완 관계를 만들 근거가 충분하지 않습니다.'
    if (input.reason === 'VERIFICATION_REJECTED' && input.crossSource.comparableForJudgment) {
      headline = '비교 가능한 주장이 있지만 검증된 관계가 없습니다'
      body =
        '일부 주장은 관련되어 보이지만, 근거와 명제 정합성을 통과한 cross-source 관계가 없습니다. 억지로 관계를 표시하지 않았습니다.'
    }
  } else {
    headline = 'These videos are not answering the same question'
    body = `Central question: ${input.intent.rawQuestion}\n\n${input.crossSource.summary}\n\n`
    body += sourceSummaries.map((s) => `· ${s}`).join('\n')
    body +=
      '\n\nThere is not enough comparable evidence to form defensible agreement, divide, or complementary relationships across these videos.'
    if (input.reason === 'VERIFICATION_REJECTED' && input.crossSource.comparableForJudgment) {
      headline = 'Comparable claims exist but no verified cross-source relationships'
      body =
        'Some claims appear related, but none passed evidence-backed verification. Relationships were not forced.'
    }
  }

  return {
    reason: input.reason,
    headline,
    body,
    sourceSummaries,
    isGoodZero,
  }
}

export function applyNoRelationshipJudgmentPatch(input: {
  judgment: { statement: string; confidence: string; rationale?: string } | null
  synthesis: { headline?: string; summary?: string } | null
  message: NoRelationshipProductMessage
}): {
  judgment: { statement: string; confidence: string; rationale?: string }
  synthesis: { headline: string; summary: string }
} {
  const judgment = {
    statement: input.message.headline,
    confidence: 'low',
    rationale: input.message.body,
  }
  const synthesis = {
    headline: input.message.headline,
    summary: input.message.body,
  }
  if (input.judgment) {
    judgment.statement = input.message.headline
    judgment.rationale = input.message.body
  }
  if (input.synthesis?.summary) {
    synthesis.summary = `${input.message.body}\n\n${input.synthesis.summary}`
  }
  return { judgment, synthesis }
}
