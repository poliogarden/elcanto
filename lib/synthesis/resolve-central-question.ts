import type { SynthesisDraft } from '@/lib/types/synthesis-draft'
import { resolveDraftQuestion } from '@/lib/types/synthesis-draft'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

export const DEFAULT_GENERIC_CENTRAL_QUESTION = 'What do these sources say?'

export function resolveJobCentralQuestion(
  draft: SynthesisDraft,
  document?: Pick<SynthesisDocument, 'userQuestion'>,
): string {
  const fromDraft = resolveDraftQuestion(draft)
  if (fromDraft) return fromDraft

  const fromDocument = document?.userQuestion?.trim()
  if (fromDocument) return fromDocument

  return DEFAULT_GENERIC_CENTRAL_QUESTION
}

export function isGenericCentralQuestion(question: string): boolean {
  return question.trim() === DEFAULT_GENERIC_CENTRAL_QUESTION
}

export function hasUserSubmittedQuestion(
  draft: SynthesisDraft,
  document?: Pick<SynthesisDocument, 'userQuestion'>,
): boolean {
  return Boolean(resolveDraftQuestion(draft) || document?.userQuestion?.trim())
}
