import { getOpenAIClient } from '@/lib/ai/openai'
import { callStructured } from '@/lib/ai/structured-call'
import { buildOutputLanguageInstruction } from '@/lib/i18n/output-language-prompt'
import {
  CrossSourceSynthesisSchema,
  type CrossSourceSynthesisPayload,
  type DirectSourceAnswer,
} from '@/lib/direct-synthesis/types'
import type { QuestionMode } from '@/lib/direct-synthesis/question-mode'
import {
  detectSynthesisIntent,
  synthesisIntentPromptHint,
} from '@/lib/direct-synthesis/question-mode'
import type { EvidenceSnippet } from '@/lib/direct-synthesis/evidence'

export function isComparableForCrossSource(answerability: DirectSourceAnswer['answerability']): boolean {
  return answerability !== 'NOT_RELEVANT'
}

function wireEvidenceRef(
  sourceId: string,
  text: string,
  catalog: EvidenceSnippet[],
): string | undefined {
  const exact = catalog.find((e) => e.sourceId === sourceId && e.text === text)
  if (exact) return exact.ref
  const norm = text.toLowerCase().slice(0, 48)
  const partial = catalog.find(
    (e) =>
      e.sourceId === sourceId &&
      (e.text.toLowerCase().includes(norm) || norm.includes(e.text.toLowerCase().slice(0, 48))),
  )
  return partial?.ref
}

export async function synthesizeDirectCrossSource(input: {
  centralQuestion: string
  questionMode?: QuestionMode
  sourceAnswers: DirectSourceAnswer[]
  evidenceCatalog?: EvidenceSnippet[]
  outputLanguage?: 'ko' | 'en'
}): Promise<CrossSourceSynthesisPayload> {
  const openai = getOpenAIClient()
  const lang = buildOutputLanguageInstruction(input.outputLanguage ?? 'en')
  const questionMode = input.questionMode ?? 'CONTENT_QUESTION'
  const intentHint =
    questionMode === 'SYNTHESIS_QUESTION'
      ? synthesisIntentPromptHint(detectSynthesisIntent(input.centralQuestion))
      : ''

  const comparableAnswers = input.sourceAnswers.filter((a) =>
    isComparableForCrossSource(a.answerability),
  )

  const payload = comparableAnswers.map((a) => ({
    sourceId: a.sourceId,
    sourceTitle: a.sourceTitle,
    answerability: a.answerability,
    answer: a.answer,
    keyEvidence: a.keyEvidence.map((ev) => ({
      ref:
        input.evidenceCatalog
          ? wireEvidenceRef(a.sourceId, ev.text, input.evidenceCatalog)
          : undefined,
      text: ev.text,
      startTime: ev.startTime,
      endTime: ev.endTime,
    })),
    uncertainty: a.uncertainty,
    confidence: a.confidence,
  }))

  const notRelevant = input.sourceAnswers
    .filter((a) => a.answerability === 'NOT_RELEVANT')
    .map((a) => ({ sourceId: a.sourceId, sourceTitle: a.sourceTitle }))

  return callStructured({
    openai,
    role: 'synthesis',
    operation: 'REASONING_SYNTHESIS',
    system: `${lang}

${questionMode === 'SYNTHESIS_QUESTION' ? `This is a SYNTHESIS_QUESTION: the user asks for cross-source comparison, not per-video answers to the literal question text.
${intentHint}
Per-source entries describe each video's perspective for comparison — do not treat them as answers to the synthesis question itself.
` : ''}You synthesize multiple video sources to answer ONE central question.

Input includes only sources that may contribute to the question (NOT_RELEVANT sources are excluded from comparison).

Your job is NOT to summarize each video separately. Per-video detail is shown elsewhere.

Produce:

1. directAnswer — A direct judgment on the central question from cross-source synthesis.
   Do NOT write "Video 1 says... Video 2 says...".
   Answer what the sources collectively support about the question.

2. agreements — Only when TWO OR MORE comparable sources support the same or compatible core claim.
   Include sourceIds (2+) and evidenceRefs from provided snippets.

3. disagreements — Only when TWO OR MORE comparable sources give conflicting conclusions on the SAME issue.
   Do not create disagreement from unrelated topics.

4. complementaryViews — Non-conflicting perspectives that fill different parts of the answer.

5. uniqueViews — Important perspective held by ONE comparable source on the central question,
   not supported by other sources. NOT for irrelevant tangents.

6. insights — Array (0–4). Cross-source interpretations that emerge only when comparing sources.
   Do NOT force exactly 3 insights. If no defensible cross-source insight exists, return [].
   Each insight must include:
   - id (stable string, e.g. insight_1)
   - title, summary, explanation (user-facing why connected — not chain-of-thought)
   - sourceIds (2+ comparable sources)
   - sourceConcepts: one or more per contributing source with:
     id (e.g. sc_1_thiel), sourceId, label, optional summary, evidenceRefs (must cite transcript refs)
   - connectionConcepts: AI-derived bridge concepts with:
     id, label, explanation, derivedFromConceptIds (sourceConcept ids used)
   - evidenceRefs: provenance refs from keyEvidence
   Every sourceConcept MUST cite at least one evidenceRef from that source's keyEvidence.
   connectionConcepts are AI interpretations — never quote them as if spoken in a video.

7. insight — Legacy nullable field. Set to null; use insights array instead.

8. nonComparableSources — Sources listed as not relevant to the question (if any were provided).

9. uncertainty — Honest limits of the synthesis.

Rules:
- Do not force agreement, disagreement, unique, or insights when evidence is insufficient.
- Do not invent relationships because sources share a broad topic.
- Every relationship must cite evidenceRefs using the ref values on keyEvidence items
(format sourceId:evidenceId).
- If you cannot cite evidence, omit the relationship.`,
    user: `Central question: ${input.centralQuestion}

Comparable sources for cross-source synthesis:
${JSON.stringify(payload, null, 2)}

Not relevant to this question (do not use in agree/divide/unique/insights):
${JSON.stringify(notRelevant, null, 2)}`,
    schema: CrossSourceSynthesisSchema,
    schemaName: 'direct_cross_source_synthesis',
    maxOutputTokens: 5000,
  })
}
