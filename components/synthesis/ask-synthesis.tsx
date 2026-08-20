'use client'

import { useEffect, useState } from 'react'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import type { SynthesisViewModel } from '@/lib/types/view-model'
import { formatTimestamp } from '@/lib/youtube/timestamp'
import { useLocale } from '@/lib/i18n/locale-context'
import { VoiceTags } from './voice-tags'

const SUGGESTION_KEYS = [
  'ask.suggestions.agree',
  'ask.suggestions.disagree',
  'ask.suggestions.strongest',
  'ask.suggestions.missing',
  'ask.suggestions.founders',
] as const

type AskNote = {
  id: number
  question: string
  answer: string
  basedOn: number[]
  refs: Array<{ voice: number; timestamp: string; watchUrl?: string }>
  showEvidence: boolean
}

export function AskSynthesis({
  view,
  document,
  scope,
  onClearScope,
  prefillQuestion,
  onPrefillConsumed,
  compact = false,
  showSuggested = true,
  progressive = false,
}: {
  view: SynthesisViewModel
  document: SynthesisDocument
  scope?: { type: string; label: string; context: string } | null
  onClearScope?: () => void
  prefillQuestion?: string
  onPrefillConsumed?: () => void
  compact?: boolean
  showSuggested?: boolean
  progressive?: boolean
}) {
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState<AskNote[]>([])
  const [counter, setCounter] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const { t, resolvedOutputLanguage } = useLocale()

  useEffect(() => {
    if (!prefillQuestion) return
    setValue(prefillQuestion)
    onPrefillConsumed?.()
  }, [prefillQuestion, onPrefillConsumed])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || loading || !document.result) return

    setLoading(true)
    try {
      const sources = document.voices.filter((v) => v.analysis).map((v) => v.analysis!)

      const res = await fetch('/api/synthesis/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          synthesis: document.result,
          sources,
          scope: scope ?? undefined,
          outputLanguage: resolvedOutputLanguage,
        }),
      })

      const data = (await res.json()) as {
        answer?: {
          answer: string
          usedSourceIds: string[]
          evidence: Array<{ videoId: string; timestamp: number; text: string }>
        }
        error?: string
      }

      if (!res.ok || !data.answer) {
        throw new Error(data.error ?? t('ask.couldNotAnswerShort'))
      }

      const voiceBySourceId = new Map(
        document.voices.map((v) => [`source_${v.voice.n}`, v.voice.n]),
      )

      const basedOn = data.answer.usedSourceIds
        .map((id) => {
          const match = id.match(/(\d+)/)
          return match ? Number(match[1]) : voiceBySourceId.get(id) ?? null
        })
        .filter((n): n is number => n !== null)

      const voiceByYoutubeId = new Map(
        document.voices.map((v) => [v.voice.youtubeId, v.voice.n]),
      )

      const refs = data.answer.evidence.map((ev) => {
        const voiceN = voiceByYoutubeId.get(ev.videoId) ?? 0
        return {
          voice: voiceN,
          timestamp: formatTimestamp(ev.timestamp),
          watchUrl: `https://www.youtube.com/watch?v=${ev.videoId}&t=${Math.floor(ev.timestamp)}s`,
        }
      })

      setNotes((prev) => [
        { id: counter, question: q, answer: data.answer!.answer, basedOn, refs, showEvidence: false },
        ...prev,
      ])
      setCounter((c) => c + 1)
      setValue('')
    } catch {
      setNotes((prev) => [
        {
          id: counter,
          question: q,
          answer: t('ask.couldNotAnswer'),
          basedOn: [],
          refs: [],
          showEvidence: false,
        },
        ...prev,
      ])
      setCounter((c) => c + 1)
    } finally {
      setLoading(false)
    }
  }

  const visibleSuggestions = progressive && !showAllSuggestions
    ? SUGGESTION_KEYS.slice(0, 3).map((key) => t(key))
    : SUGGESTION_KEYS.map((key) => t(key))

  return (
    <section className={compact ? '' : 'border-t border-line px-5 py-14 md:px-8 md:py-20'}>
      <div className={compact ? 'mt-6' : 'grid gap-10 lg:grid-cols-12'}>
        {!compact && (
          <div className="lg:col-span-5">
            <span className="mono-label text-xs text-ink-soft">{t('ask.askTheSynthesis')}</span>
            <h2 className="mt-4 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-balance md:text-6xl">
              {t('ask.askAllVoices', { count: view.readyVoiceCount })}
            </h2>
            <p className="mt-5 font-serif text-lg leading-relaxed text-ink-soft text-pretty">
              {t('ask.description')}
            </p>
          </div>
        )}

        <div className={compact ? '' : 'lg:col-span-7'}>
          {scope && (
            <div className="mb-4 flex items-center justify-between border border-line px-4 py-3">
              <p className="mono text-[11px] text-ink-soft">
                {t('ask.scopeLabel')} <span className="text-ink">{scope.label}</span>
              </p>
              {onClearScope && (
                <button type="button" onClick={onClearScope} className="mono-label text-[10px]">
                  {t('ask.scopeClear')}
                </button>
              )}
            </div>
          )}
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
              placeholder={
                progressive
                  ? t('ask.placeholder')
                  : t('ask.placeholderVoices', { count: view.readyVoiceCount })
              }
              className="flex-1 bg-transparent px-4 py-4 font-serif text-base text-ink placeholder:text-ink-soft focus:outline-none disabled:opacity-50 md:text-lg"
            />
            <button
              type="button"
              onClick={() => void ask(value)}
              disabled={loading || !value.trim()}
              className="mono-label border-t border-line bg-ink px-6 py-4 text-xs text-background transition-opacity hover:opacity-80 disabled:opacity-40 sm:border-l sm:border-t-0"
            >
              {loading ? t('ask.asking') : t('ask.ask')}
            </button>
          </div>

          {showSuggested && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {visibleSuggestions.map((s) => (
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
              {progressive && SUGGESTION_KEYS.length > 3 && !showAllSuggestions && (
                <button
                  type="button"
                  onClick={() => setShowAllSuggestions(true)}
                  className="mono-label mt-3 text-[10px] text-ink-soft hover:text-ink"
                >
                  {t('ask.moreQuestions')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {notes.length > 0 && (
        <div className={progressive ? 'mt-8 space-y-6' : 'mt-14 border-t border-line'}>
          {notes.map((note, idx) => (
            <article
              key={note.id}
              className={
                progressive
                  ? 'border border-line p-5'
                  : 'grid gap-6 border-b border-line py-10 md:grid-cols-12 md:gap-10'
              }
            >
              {progressive ? (
                <>
                  <p className="mono-label text-[10px] text-ink-soft">{t('ask.answer')}</p>
                  <p className="mt-3 font-serif text-lg leading-relaxed">{note.answer}</p>
                  {note.basedOn.length > 0 && (
                    <p className="mono mt-4 text-[10px] text-ink-soft">
                      {t('ask.supportedBy')}{' '}
                      {note.basedOn.map((v) => String(v).padStart(2, '0')).join(' · ')}
                    </p>
                  )}
                  {note.refs.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setNotes((prev) =>
                          prev.map((n) =>
                            n.id === note.id ? { ...n, showEvidence: !n.showEvidence } : n,
                          ),
                        )
                      }
                      className="mono-label mt-3 text-[10px] text-ink-soft hover:text-ink"
                    >
                      {note.showEvidence ? t('ask.hideEvidence') : t('ask.viewEvidence')}
                    </button>
                  )}
                  {note.showEvidence && note.refs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {note.refs.map((r) => (
                        <a
                          key={`${r.voice}-${r.timestamp}`}
                          href={r.watchUrl ?? '#evidence'}
                          target={r.watchUrl ? '_blank' : undefined}
                          rel={r.watchUrl ? 'noopener noreferrer' : undefined}
                          className="mono border border-line px-3 py-2 text-[11px] text-ink transition-colors hover:bg-ink hover:text-background"
                        >
                          {String(r.voice).padStart(2, '0')} — {r.timestamp} →
                        </a>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="md:col-span-4">
                    <span className="mono-label text-[11px] text-ink-soft">
                      {t('ask.questionLabel', {
                        num: String(notes.length - idx).padStart(2, '0'),
                      })}
                    </span>
                    <h3 className="mt-3 font-serif text-2xl font-medium leading-tight text-balance md:text-3xl">
                      {note.question}
                    </h3>
                  </div>
                  <div className="md:col-span-8">
                    <p className="font-serif text-lg leading-relaxed text-pretty md:text-xl">
                      {note.answer}
                    </p>
                    <div className="mt-6 border-t border-line pt-5">
                      <p className="mono-label mb-3 text-[10px] text-ink-soft">
                        {t('ask.basedOnVoices')}
                      </p>
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
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
