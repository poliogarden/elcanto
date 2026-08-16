'use client'

import { useState } from 'react'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import { VoiceTags } from './voice-tags'

type AskNote = {
  id: number
  question: string
  answer: string
  basedOn: number[]
  refs: Array<{ voice: number; timestamp: string; watchUrl?: string }>
}

export function AskSynthesis({
  view,
  document,
}: {
  view: SynthesisViewModel
  document: SynthesisDocument
}) {
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState<AskNote[]>([])
  const [counter, setCounter] = useState(0)
  const [loading, setLoading] = useState(false)

  async function ask(question: string) {
    const q = question.trim()
    if (!q || loading || !document.result) return

    setLoading(true)
    try {
      const analyses = document.voices.filter((v) => v.analysis).map((v) => v.analysis!)
      const youtubeIds = document.voices.map((v) => v.voice.youtubeId)

      const res = await fetch('/api/synthesis/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          synthesis: document.result,
          analyses,
          youtubeIds,
        }),
      })

      const data = (await res.json()) as {
        answer?: {
          answer: string
          basedOnVoiceIds: string[]
          evidence: Array<{ videoId: string; timestamp: number; text: string }>
        }
        error?: string
      }

      if (!res.ok || !data.answer) {
        throw new Error(data.error ?? 'Could not answer.')
      }

      const voiceByYoutubeId = new Map(
        document.voices.map((v) => [v.voice.youtubeId, v.voice.n]),
      )

      const basedOn = data.answer.basedOnVoiceIds
        .map((id) => {
          const match = id.match(/(\d+)/)
          return match ? Number(match[1]) : voiceByYoutubeId.get(id) ?? null
        })
        .filter((n): n is number => n !== null)

      const refs = data.answer.evidence.map((ev) => {
        const voiceN = voiceByYoutubeId.get(ev.videoId) ?? 0
        return {
          voice: voiceN,
          timestamp: formatTimestamp(ev.timestamp),
          watchUrl: `https://www.youtube.com/watch?v=${ev.videoId}&t=${Math.floor(ev.timestamp)}s`,
        }
      })

      setNotes((prev) => [
        { id: counter, question: q, answer: data.answer!.answer, basedOn, refs },
        ...prev,
      ])
      setCounter((c) => c + 1)
      setValue('')
    } catch {
      setNotes((prev) => [
        {
          id: counter,
          question: q,
          answer: 'Could not generate an answer. Please try again.',
          basedOn: [],
          refs: [],
        },
        ...prev,
      ])
      setCounter((c) => c + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="border-t border-line px-5 py-14 md:px-8 md:py-20">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <span className="mono-label text-xs text-ink-soft">Ask the synthesis</span>
          <h2 className="mt-4 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-balance md:text-6xl">
            Ask all {view.readyVoiceCount} voices.
          </h2>
          <p className="mt-5 font-serif text-lg leading-relaxed text-ink-soft text-pretty">
            Ask across everything you&apos;ve added. Every answer cites the voices it draws from.
          </p>
        </div>

        <div className="lg:col-span-7">
          <div className="flex flex-col border border-line sm:flex-row">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  void ask(value)
                }
              }}
              disabled={loading}
              placeholder="What do you want to understand?"
              className="flex-1 bg-transparent px-4 py-4 font-serif text-lg text-ink placeholder:text-ink-soft focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void ask(value)}
              disabled={loading || !value.trim()}
              className="mono-label border-t border-line bg-ink px-6 py-4 text-xs text-background transition-opacity hover:opacity-80 disabled:opacity-40 sm:border-l sm:border-t-0"
            >
              {loading ? 'Asking…' : `Ask ${'\u2192'}`}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {view.suggestedQuestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                disabled={loading}
                className="mono border border-line px-3 py-2 text-left text-[11px] text-ink-soft transition-colors hover:bg-ink hover:text-background disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="mt-14 border-t border-line">
          {notes.map((note, idx) => (
            <article
              key={note.id}
              className="grid gap-6 border-b border-line py-10 md:grid-cols-12 md:gap-10"
            >
              <div className="md:col-span-4">
                <span className="mono-label text-[11px] text-ink-soft">
                  Question {String(notes.length - idx).padStart(2, '0')}
                </span>
                <h3 className="mt-3 font-serif text-2xl font-medium leading-tight text-balance md:text-3xl">
                  {note.question}
                </h3>
              </div>
              <div className="md:col-span-8">
                <p className="font-serif text-lg leading-relaxed text-pretty md:text-xl">{note.answer}</p>
                <div className="mt-6 border-t border-line pt-5">
                  <p className="mono-label mb-3 text-[10px] text-ink-soft">Based on voices</p>
                  {note.basedOn.length > 0 && <VoiceTags voices={note.basedOn} />}
                  {note.refs.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {note.refs.map((r) => (
                        <a
                          key={`${r.voice}-${r.timestamp}`}
                          href={r.watchUrl ?? '#evidence'}
                          target={r.watchUrl ? '_blank' : undefined}
                          rel={r.watchUrl ? 'noopener noreferrer' : undefined}
                          className="mono border border-line px-3 py-2 text-[11px] text-ink transition-colors hover:bg-ink hover:text-background"
                        >
                          Voice {String(r.voice).padStart(2, '0')} — {r.timestamp} {'\u2192'}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
