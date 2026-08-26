'use client'

import { useState } from 'react'
import type { SurvivalAnalysis, SurvivalAskAnswer } from '@/lib/survival/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'

const SUGGESTIONS = [
  'What does everyone agree on?',
  'What is the biggest disagreement?',
  'Which claim is weakest?',
  'What are they missing?',
  'What should I believe?',
]

type Props = {
  synthesisId: string
  survival: SurvivalAnalysis
  document: SynthesisDocument
}

export function SurvivalAskPanel({ synthesisId, survival, document }: Props) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<SurvivalAskAnswer | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(q: string) {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/survival/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synthesisId, question: trimmed }),
      })
      const data = (await res.json()) as SurvivalAskAnswer & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Ask failed')
      setAnswer(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ask failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-12 rounded-2xl border border-line bg-paper-2/30 p-5">
      <p className="text-xs font-semibold tracking-wide text-ink-soft">ASK THESE VIDEOS</p>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask these videos…"
          className="min-w-0 flex-1 rounded-lg bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit(question)
          }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void submit(question)}
          className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          →
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuestion(s)
              void submit(s)
            }}
            className="rounded-full bg-paper-2 px-3 py-1 text-xs text-ink hover:bg-paper-2/80"
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="mt-4 text-sm text-ink-soft">Thinking…</p>}
      {error && (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {answer && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-[10px] font-semibold text-ink-soft">ANSWER</p>
          <p className="mt-1 text-base font-medium text-ink">{answer.answer}</p>
          {answer.supportedByVideoIds.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold text-ink-soft">SUPPORTED BY</p>
              <p className="mt-1 text-xs text-ink">
                {answer.supportedByVideoIds.map((id) => `Video ${id.slice(0, 8)}…`).join(', ')}
              </p>
            </div>
          )}
          {answer.why.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold text-ink-soft">WHY</p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink-soft">
                {answer.why.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
