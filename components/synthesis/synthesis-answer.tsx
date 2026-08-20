import type { TheAnswerView } from '@/lib/types/view-model'

type Props = {
  theAnswer: TheAnswerView
}

export function SynthesisAnswer({ theAnswer }: Props) {
  return (
    <section className="border-b border-line py-6 md:py-8">
      <span className="mono-label text-[10px] text-ink-soft">THE ANSWER</span>
      <div className="mt-6 max-w-4xl space-y-5">
        {theAnswer.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="font-serif text-xl leading-relaxed md:text-2xl">
            {paragraph}
          </p>
        ))}
      </div>
      <p className="mono mt-8 text-[11px] uppercase tracking-wide text-ink-soft">
        {theAnswer.metadataLine}
      </p>
    </section>
  )
}
