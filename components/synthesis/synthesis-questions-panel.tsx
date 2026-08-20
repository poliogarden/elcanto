import type { KnowledgeGapView } from '@/lib/types/view-model'
import type { KnowledgeExtensionStatus } from '@/components/synthesis/use-deferred-knowledge-extension'

type Props = {
  questions: KnowledgeGapView[]
  onAsk: (question: string) => void
  knowledgeStatus?: KnowledgeExtensionStatus
}

export function SynthesisQuestionsPanel({ questions, onAsk, knowledgeStatus }: Props) {
  if (knowledgeStatus === 'loading') {
    return (
      <section className="border-b border-line py-6 md:py-8">
        <span className="mono-label text-[10px] text-ink-soft">QUESTIONS WORTH ASKING</span>
        <p className="mt-6 font-serif text-lg text-ink-soft">Finding questions these voices raise…</p>
      </section>
    )
  }

  if (questions.length === 0) return null

  return (
    <section className="border-b border-line py-6 md:py-8">
      <span className="mono-label text-[10px] text-ink-soft">QUESTIONS WORTH ASKING</span>
      <ul className="mt-8 max-w-3xl space-y-4">
        {questions.map((q) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onAsk(q.question)}
              className="w-full border border-line px-5 py-4 text-left transition-colors hover:bg-paper-2"
            >
              <p className="font-serif text-xl leading-snug">{q.question}</p>
              {q.description && (
                <p className="mt-2 font-serif text-sm text-ink-soft">{q.description}</p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
