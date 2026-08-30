'use client'

import { useMemo } from 'react'
import type { DirectSynthesisPersisted } from '@/lib/direct-synthesis/persisted'
import { evidenceTimeSeconds } from '@/lib/direct-synthesis/evidence-time'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { countFailedVoices } from '@/lib/types/synthesis-document'
import { resolveVideoThumbnail } from '@/lib/youtube/thumbnail'
import { formatTimestamp, youtubeWatchUrl } from '@/lib/youtube/timestamp'

const ANSWERABILITY_KO: Record<string, string> = {
  DIRECT: '직접 답함',
  PARTIAL: '부분적으로 답함',
  CONTEXT_ONLY: '관련 배경 정보',
  NOT_RELEVANT: '이 질문과 직접 관련 없음',
}

const ANSWERABILITY_EN: Record<string, string> = {
  DIRECT: 'Directly answers',
  PARTIAL: 'Partially answers',
  CONTEXT_ONLY: 'Background context',
  NOT_RELEVANT: 'Not directly relevant',
}

type Props = {
  direct: DirectSynthesisPersisted
  document: SynthesisDocument
}

function participationLabel(
  answerability: string,
  questionMode: DirectSynthesisPersisted['questionMode'],
  lang: 'ko' | 'en',
): string {
  if (questionMode === 'SYNTHESIS_QUESTION') {
    if (answerability === 'NOT_RELEVANT') {
      return lang === 'ko' ? '비교에서 제외' : 'Excluded from comparison'
    }
    return lang === 'ko' ? '비교에 포함' : 'Included in comparison'
  }
  return answerabilityLabel(answerability, lang)
}

function answerabilityLabel(code: string, lang: 'ko' | 'en'): string {
  const map = lang === 'ko' ? ANSWERABILITY_KO : ANSWERABILITY_EN
  return map[code] ?? code
}

function analysisScopeText(
  direct: DirectSynthesisPersisted,
  lang: 'ko' | 'en',
): string {
  if (direct.questionMode === 'SYNTHESIS_QUESTION') {
    const compared = direct.sourceAnswers.filter((a) => a.answerability !== 'NOT_RELEVANT').length
    const total = direct.sourceAnswers.length
    return lang === 'ko'
      ? `${total}개 영상을 비교·종합했습니다 (${compared}개 포함).`
      : `Compared and synthesized ${compared} of ${total} videos.`
  }

  const total = direct.sourceAnswers.length
  const directCount = direct.sourceAnswers.filter((a) => a.answerability === 'DIRECT').length
  const partialCount = direct.sourceAnswers.filter((a) => a.answerability === 'PARTIAL').length
  const contextCount = direct.sourceAnswers.filter(
    (a) => a.answerability === 'CONTEXT_ONLY',
  ).length

  if (lang === 'ko') {
    if (directCount > 0 && partialCount === 0 && contextCount === 0) {
      return `${total}개 영상 중 ${directCount}개 영상이 이 질문에 직접 답합니다.`
    }
    const parts: string[] = []
    if (directCount > 0) parts.push(`${directCount}개가 직접 답함`)
    if (partialCount > 0) parts.push(`${partialCount}개가 부분적으로 답함`)
    if (contextCount > 0) parts.push(`${contextCount}개가 관련 배경 정보`)
    return `${total}개 영상 중 ${parts.join(', ')}.`
  }

  if (directCount > 0 && partialCount === 0 && contextCount === 0) {
    return `${directCount} of ${total} videos directly answer this question.`
  }
  const parts: string[] = []
  if (directCount > 0) parts.push(`${directCount} direct`)
  if (partialCount > 0) parts.push(`${partialCount} partial`)
  if (contextCount > 0) parts.push(`${contextCount} background`)
  return `${total} videos: ${parts.join(', ')}.`
}

function notRelevantFallback(lang: 'ko' | 'en'): string {
  return lang === 'ko'
    ? '이 영상에서는 이 질문에 답할 근거를 찾지 못했습니다.'
    : 'No basis to answer this question was found in this video.'
}

function sourceLabels(
  sourceIds: string[],
  voiceBySource: Map<string, { voice: { n: number; title: string } }>,
): string {
  return sourceIds
    .map((id) => {
      const entry = voiceBySource.get(id)
      if (!entry) return id
      return `${String(entry.voice.n).padStart(2, '0')} ${entry.voice.title.slice(0, 40)}`
    })
    .join(', ')
}

function CrossSourceList({
  items,
  voiceBySource,
}: {
  items: Array<{ statement: string; sourceIds: string[] }>
  voiceBySource: Map<string, { voice: { n: number; title: string } }>
}) {
  return (
    <ul className="mt-3 space-y-3 text-sm text-ink">
      {items.map((item) => (
        <li key={item.statement} className="rounded-lg border border-line px-4 py-3">
          <p className="leading-relaxed">{item.statement}</p>
          {item.sourceIds.length > 0 && (
            <p className="mt-2 text-xs text-ink-soft">
              {sourceLabels(item.sourceIds, voiceBySource)}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

export function DirectSynthesisBoard({ direct, document }: Props) {
  const lang: 'ko' | 'en' = /[가-힣]/.test(direct.centralQuestion) ? 'ko' : 'en'
  const questionMode = direct.questionMode ?? 'CONTENT_QUESTION'

  const failedCount = countFailedVoices(document)
  const contributionBySource = useMemo(
    () => new Map(direct.sourceContributions.map((c) => [c.sourceId, c])),
    [direct.sourceContributions],
  )

  const voiceBySource = useMemo(
    () =>
      new Map(
        document.voices.map((v) => [
          v.source?.sourceId ?? `source_${v.voice.n}`,
          v,
        ]),
      ),
    [document.voices],
  )

  const uniqueViews = direct.uniqueViews ?? []
  const insight = direct.insight ?? null
  const hasCrossSourceSections =
    direct.agreements.length > 0 ||
    direct.disagreements.length > 0 ||
    uniqueViews.length > 0 ||
    direct.complementaryViews.length > 0 ||
    insight != null

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 font-ui sm:px-6">
      <section className="mb-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-ink-soft">CENTRAL QUESTION</p>
        <h1 className="mt-3 font-serif text-xl font-medium leading-snug text-ink sm:text-2xl md:text-3xl">
          {direct.centralQuestion}
        </h1>
      </section>

      <div className="mb-8 border-t border-line" aria-hidden="true" />

      <section className="mb-8 rounded-2xl border border-line bg-paper-2/40 px-6 py-8">
        <p className="text-xs font-semibold tracking-wide text-coral">
          {lang === 'ko' ? '핵심 결론' : 'Direct answer'}
        </p>
        <p className="mt-4 text-lg leading-relaxed text-ink whitespace-pre-wrap">
          {direct.directAnswer}
        </p>
      </section>

      <section className="mb-10 rounded-xl border border-line bg-paper px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-ink-soft">
          {lang === 'ko' ? '분석 범위' : 'Analysis scope'}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {analysisScopeText(direct, lang)}
        </p>
      </section>

      {direct.uncertainty.length > 0 && (
        <section className="mb-10 rounded-xl border border-line px-5 py-4">
          <p className="text-xs font-semibold tracking-wide text-ink-soft">
            {lang === 'ko' ? '판단 범위' : 'Uncertainty'}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-soft">
            {direct.uncertainty.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </section>
      )}

      {hasCrossSourceSections && (
        <div className="mb-10 border-t border-line pt-8" aria-hidden="true" />
      )}

      {direct.agreements.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft">AGREE</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {lang === 'ko' ? '공통적으로 말하는 것' : 'What sources agree on'}
          </p>
          <CrossSourceList items={direct.agreements} voiceBySource={voiceBySource} />
        </section>
      )}

      {direct.disagreements.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide text-coral">DIVIDE</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {lang === 'ko' ? '의견이 갈리는 부분' : 'Where sources diverge'}
          </p>
          <CrossSourceList items={direct.disagreements} voiceBySource={voiceBySource} />
        </section>
      )}

      {uniqueViews.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft">UNIQUE</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {lang === 'ko' ? '각 영상만의 중요한 관점' : 'Distinct per-source perspectives'}
          </p>
          <CrossSourceList items={uniqueViews} voiceBySource={voiceBySource} />
        </section>
      )}

      {direct.complementaryViews.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft">COMPLEMENTARY</h2>
          <CrossSourceList items={direct.complementaryViews} voiceBySource={voiceBySource} />
        </section>
      )}

      {insight && (
        <section className="mb-10 rounded-2xl border-2 border-coral/35 bg-paper-2/60 px-6 py-6">
          <h2 className="text-sm font-semibold tracking-widest text-coral">INSIGHT</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {lang === 'ko' ? '함께 봐야 보이는 것' : 'Visible only when sources are read together'}
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink">{insight.statement}</p>
          {insight.sourceIds.length > 0 && (
            <p className="mt-3 text-xs text-ink-soft">
              {sourceLabels(insight.sourceIds, voiceBySource)}
            </p>
          )}
        </section>
      )}

      <div className="mb-10 border-t border-line" aria-hidden="true" />

      <section className="mb-10">
        <h2 className="text-sm font-semibold tracking-wide text-ink-soft">
          {lang === 'ko' ? '영상별 관점' : 'Per-video perspectives'}
        </h2>
        <div className="mt-4 space-y-4">
          {direct.sourceAnswers.map((sa) => {
            const entry = voiceBySource.get(sa.sourceId)
            const voiceNum = entry?.voice.n ?? sa.sourceId
            const thumb = resolveVideoThumbnail(
              entry?.voice.youtubeId ?? '',
              entry?.voice.thumbnail,
            )
            const contribution = contributionBySource.get(sa.sourceId)
            const videoId = entry?.voice.youtubeId
            const notRelevantText =
              sa.answer ||
              sa.uncertainty ||
              contribution?.contribution ||
              notRelevantFallback(lang)

            return (
              <div key={sa.sourceId} className="rounded-xl border border-line p-4 sm:p-5">
                <div className="flex gap-3 sm:gap-4">
                  {thumb && (
                    <img
                      src={thumb}
                      alt=""
                      className="h-16 w-28 shrink-0 rounded-lg object-cover sm:h-20 sm:w-36"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="mono text-[11px] text-ink-soft">
                      {String(voiceNum).padStart(2, '0')}
                    </p>
                    <p className="mt-1 font-medium leading-snug text-ink">{sa.sourceTitle}</p>
                    <p className="mt-2 text-xs text-ink-soft">
                      {participationLabel(sa.answerability, questionMode, lang)}
                    </p>

                    {sa.answerability === 'NOT_RELEVANT' ? (
                      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                        {questionMode === 'SYNTHESIS_QUESTION'
                          ? lang === 'ko'
                            ? '이 영상은 비교에 포함되지 않았습니다.'
                            : 'This video was not included in the comparison.'
                          : notRelevantText}
                      </p>
                    ) : (
                      <>
                        {sa.answer && (
                          <p className="mt-3 text-sm leading-relaxed text-ink">{sa.answer}</p>
                        )}
                        {sa.keyEvidence.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <p className="text-xs font-semibold tracking-wide text-ink-soft">
                              {lang === 'ko' ? '근거' : 'Evidence'}
                            </p>
                            {sa.keyEvidence.map((ev, i) => {
                              const sec = evidenceTimeSeconds(ev.startTime ?? undefined)
                              return (
                                <blockquote
                                  key={i}
                                  className="border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-soft"
                                >
                                  <p className="text-ink">&ldquo;{ev.text}&rdquo;</p>
                                  {sec != null && videoId ? (
                                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                      <span className="mono text-ink-soft">
                                        {formatTimestamp(sec)}
                                      </span>
                                      <a
                                        href={youtubeWatchUrl(videoId, sec)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-ink underline hover:opacity-70"
                                      >
                                        {lang === 'ko' ? '영상에서 보기 →' : 'Watch in video →'}
                                      </a>
                                    </p>
                                  ) : null}
                                </blockquote>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {failedCount > 0 && (
          <p className="mt-3 text-xs text-ink-soft">
            {lang === 'ko' ? `분석 실패 영상: ${failedCount}` : `Failed videos: ${failedCount}`}
          </p>
        )}
      </section>

      {direct.nonComparableSources.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft">
            {lang === 'ko' ? '비교하기 어려운 영상' : 'Hard to compare'}
          </h2>
          <ul className="mt-3 space-y-3 text-sm">
            {direct.nonComparableSources.map((n) => {
              const entry = voiceBySource.get(n.sourceId)
              const voiceNum = entry?.voice.n ?? n.sourceId
              return (
                <li key={n.sourceId} className="rounded-lg border border-line px-4 py-3">
                  <p className="mono text-[11px] text-ink-soft">
                    {String(voiceNum).padStart(2, '0')}
                  </p>
                  <p className="mt-1 font-medium text-ink">
                    {entry?.voice.title ?? n.sourceId}
                  </p>
                  <p className="mt-2 text-ink-soft">
                    {lang === 'ko'
                      ? '이 질문에 직접 답하지 않습니다.'
                      : 'Does not directly answer this question.'}
                  </p>
                  {n.reason && (
                    <p className="mt-1 text-xs text-ink-soft">{n.reason}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {direct.evidence.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft">
            {lang === 'ko' ? '근거 / 타임스탬프' : 'Evidence / timestamps'}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {direct.evidence.slice(0, 24).map((ev) => {
              const sec = evidenceTimeSeconds(ev.timestamp)
              return (
                <li key={ev.ref} className="text-ink-soft">
                  {sec != null ? (
                    <a
                      href={youtubeWatchUrl(ev.videoId, sec)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-ink"
                    >
                      <span className="mono">[{formatTimestamp(sec)}]</span> {ev.evidenceText}
                    </a>
                  ) : (
                    ev.evidenceText
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
