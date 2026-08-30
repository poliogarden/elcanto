'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Filter,
  Play,
  Sparkles,
  X,
} from 'lucide-react'
import type { DirectSynthesisPersisted } from '@/lib/direct-synthesis/persisted'
import type { SourceConcept } from '@/lib/direct-synthesis/types'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import {
  buildInsightExplorerModel,
  countInsightEvidence,
  insightDisplayNumber,
  type ExplorerSource,
} from '@/components/insight-explorer/insight-explorer-model'
import './insight-explorer.css'

type Props = {
  direct: DirectSynthesisPersisted
  document: SynthesisDocument
  /** When true, omit explorer topbar/footer — parent page already provides site chrome. */
  embedded?: boolean
}

type DetailNode = {
  kind: 'SOURCE' | 'SOURCE_CONCEPT' | 'AI_CONNECTION' | 'INSIGHT'
  label: string
  body?: string
  sourceName?: string
  evidenceRef?: string
  insightId?: string
}

function SourceMark({
  source,
  small = false,
}: {
  source: ExplorerSource
  small?: boolean
}) {
  return (
    <span
      className={`ie-source-mark ${source.colorClass} ${small ? 'ie-source-mark-small' : ''}`}
      aria-label={source.name}
    >
      {source.short.slice(0, 1)}
    </span>
  )
}

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <div className="ie-section-label">
      <span>{number}</span>
      <span>{children}</span>
    </div>
  )
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function firstConceptEvidence(
  concept: SourceConcept,
  evidenceByRef: Map<string, { timeLabel: string; quote: string; watchUrl?: string }>,
) {
  for (const ref of concept.evidenceRefs) {
    const ev = evidenceByRef.get(ref)
    if (ev) return ev
  }
  return null
}

export function InsightExplorerResult({ direct, document, embedded = false }: Props) {
  const model = useMemo(
    () => buildInsightExplorerModel(direct, document),
    [direct, document],
  )

  const [selectedId, setSelectedId] = useState<string | null>(
    model.insights[0]?.id ?? null,
  )
  const [detailNode, setDetailNode] = useState<DetailNode | null>(null)
  const [filter, setFilter] = useState('all')
  const [showAllTranscript, setShowAllTranscript] = useState(false)

  const selected =
    model.insights.find((i) => i.id === selectedId) ?? model.insights[0] ?? null

  const insightEvidenceRefs = useMemo(() => {
    const refs = new Set<string>()
    const scope = selected ? [selected] : model.insights
    for (const insight of scope) {
      for (const ref of insight.evidenceRefs) refs.add(ref)
      for (const sc of insight.sourceConcepts) {
        for (const ref of sc.evidenceRefs) refs.add(ref)
      }
    }
    return refs
  }, [selected, model.insights])

  const supplementalEvidence = useMemo(() => {
    if (!showAllTranscript) return []
    const items: typeof model.evidence = []
    const seen = new Set(model.evidence.map((e) => e.ref))
    for (const entry of document.voices) {
      const sourceId =
        entry.analysis?.sourceId ?? entry.source?.sourceId ?? `source_${entry.voice.n}`
      const youtubeId = entry.voice.youtubeId
      const source = model.sourceById.get(sourceId)
      for (const ev of entry.analysis?.evidence ?? []) {
        const ref = `${sourceId}:${ev.id}`
        if (seen.has(ref)) continue
        seen.add(ref)
        const timeSeconds = ev.timestamp ?? undefined
        const watchUrl =
          timeSeconds != null && youtubeId
            ? `https://www.youtube.com/watch?v=${youtubeId}&t=${Math.floor(timeSeconds)}s`
            : source?.url
        items.push({
          ref,
          sourceId,
          youtubeId,
          timeLabel:
            timeSeconds != null
              ? `${String(Math.floor(timeSeconds / 60)).padStart(2, '0')}:${String(
                  Math.floor(timeSeconds % 60),
                ).padStart(2, '0')}`
              : '—',
          timeSeconds,
          quote: ev.text,
          usedByInsightIds: [],
          watchUrl,
        })
      }
    }
    return items
  }, [document.voices, model.evidence, model.sourceById, showAllTranscript])

  const visibleEvidence = useMemo(() => {
    let items = showAllTranscript
      ? [...model.evidence, ...supplementalEvidence]
      : model.evidence.filter((item) => insightEvidenceRefs.has(item.ref))

    if (filter !== 'all') {
      items = items.filter((item) => item.sourceId === filter)
    }
    return items
  }, [
    filter,
    insightEvidenceRefs,
    model.evidence,
    showAllTranscript,
    supplementalEvidence,
  ])

  const participatingSources = selected
    ? model.sources.filter((s) => selected.sourceIds.includes(s.id))
    : []

  const selectInsight = (id: string) => {
    setSelectedId(id)
    setDetailNode(null)
  }

  const labels = model.lang === 'ko'
    ? {
        discover: '함께 봐야 보이는 것',
        discoverSub: '각 영상을 따로 봤을 때는 드러나지 않는 연결입니다.',
        aiNote: 'AI-DERIVED SYNTHESIS\n원본 인용이 아닌 해석입니다.',
        emptyInsights: '이번 자료에서는 근거 있는 교차 통찰을 찾지 못했습니다.',
        connect: '생각은 어디에서 연결되었을까?',
        connectSub: 'Source에서 출발한 개념이 새로운 해석으로 이어지는 경로입니다.',
        legendSource: '원본 개념',
        legendAi: 'AI 연결 개념',
        trace: '이 Insight는 어떻게 만들어졌나요?',
        traceSub: '숨겨진 추론이 아닌, 확인 가능한 provenance입니다.',
        why: '왜 이렇게 연결했나요?',
        compare: '같이 놓고 보면',
        compareSub: '서로의 관점이 포개질 때 선명해지는 것들입니다.',
        agree: '공통으로 보는 것',
        divide: '갈리는 지점',
        complement: '서로 채워주는 관점',
        unique: '이 영상만 말하는 것',
        verify: '원본에서 확인하기',
        verifySub: '모든 중요한 아이디어는 원본의 timestamp로 돌아갈 수 있습니다.',
        verifyNote: '인사이트는 source의 인용이\n아닌 AI-derived synthesis입니다.',
        connectView: '연결 보기',
        evidenceView: '근거 보기',
        sourcesMeta: 'sources',
        comparedMeta: 'compared',
        insightsMeta: 'insights',
        sourceConceptKind: 'SOURCE CONCEPT',
        sourceConceptOrigin: '원본 영상에서 도출된 개념',
        aiConnection: 'AI CONNECTION',
        aiDerived: 'AI가 만든 연결',
        aiNotice:
          '이 개념은 원본 영상의 직접 표현이 아니라,\n여러 source를 연결해 AI가 도출한 해석입니다.',
        watch: '영상에서 보기',
        usedIn: 'USED IN',
        connectionMeet: '여러 source의 개념이\n이 지점에서 만납니다.',
        link: '연결',
        interpret: '해석',
        evidenceCount: '근거',
        showAllTranscript: '전체 Transcript 보기',
        showInsightEvidence: 'Insight 근거만 보기',
      }
    : {
        discover: 'What emerges together',
        discoverSub: 'Connections that do not appear when videos are watched alone.',
        aiNote: 'AI-DERIVED SYNTHESIS\nNot original quotes.',
        emptyInsights: 'No defensible cross-source insights were found in these sources.',
        connect: 'Where did ideas connect?',
        connectSub: 'How source concepts lead to new interpretation.',
        legendSource: 'Source concept',
        legendAi: 'AI connection',
        trace: 'How was this insight built?',
        traceSub: 'Verifiable provenance, not hidden reasoning.',
        why: 'Why this connection?',
        compare: 'Compared side by side',
        compareSub: 'What becomes clear when perspectives overlap.',
        agree: 'Shared view',
        divide: 'Dividing points',
        complement: 'Complementary views',
        unique: 'Only in this video',
        verify: 'Verify in source',
        verifySub: 'Important ideas link back to original timestamps.',
        verifyNote: 'Insights are AI-derived synthesis,\nnot source quotes.',
        connectView: 'View connection',
        evidenceView: 'View evidence',
        sourcesMeta: 'sources',
        comparedMeta: 'compared',
        insightsMeta: 'insights',
        sourceConceptKind: 'SOURCE CONCEPT',
        sourceConceptOrigin: 'Concept from original video',
        aiConnection: 'AI CONNECTION',
        aiDerived: 'AI-made connection',
        aiNotice:
          'This concept is not a direct quote from a video.\nIt is AI interpretation linking sources.',
        watch: 'Watch in video',
        usedIn: 'USED IN',
        connectionMeet: 'Source concepts meet\nat this point.',
        link: 'link',
        interpret: 'interpret',
        evidenceCount: 'evidence',
        showAllTranscript: 'Show full transcript',
        showInsightEvidence: 'Insight evidence only',
      }

  return (
    <div className={`insight-explorer${embedded ? ' ie-embedded' : ''}`}>
      <div className="ie-main">
        {!embedded && (
          <header className="ie-topbar">
            <Link className="ie-wordmark" href="/">
              elcanto<span>·</span>
            </Link>
          </header>
        )}

        <div className="ie-progress">
          <span className="ie-progress-active">DISCOVER</span>
          <span>CONNECT</span>
          <span>TRACE</span>
          <span>COMPARE</span>
          <span>VERIFY</span>
        </div>

        <section className="ie-hero" id="top">
          <p className="ie-eyebrow">CENTRAL QUESTION</p>
          <h1>
            {model.centralQuestion.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < model.centralQuestion.split('\n').length - 1 && <br />}
              </span>
            ))}
          </h1>
          <div className="ie-hero-meta">
            <span>
              {model.totalSources} {labels.sourcesMeta}
            </span>
            <i />
            <span>
              {model.comparedSources} {labels.comparedMeta}
            </span>
            <i />
            <span>
              {model.insights.length} {labels.insightsMeta}
            </span>
          </div>
        </section>

        <section className="ie-section" id="discover">
          <SectionLabel number="01">DISCOVER</SectionLabel>
          <div className="ie-section-heading">
            <div>
              <h2>{labels.discover}</h2>
              <p>{labels.discoverSub}</p>
            </div>
            <span className="ie-heading-note">{labels.aiNote}</span>
          </div>

          {model.insights.length === 0 ? (
            <p className="ie-empty-insights">{labels.emptyInsights}</p>
          ) : (
            <div className="ie-insights-list">
              {model.insights.map((insight, index) => {
                const isSelected = selected?.id === insight.id
                const sourcesForInsight = model.sources.filter((s) =>
                  insight.sourceIds.includes(s.id),
                )
                const evidenceN = countInsightEvidence(insight)
                const displayNum = insightDisplayNumber(insight.id, index)

                return (
                  <article
                    key={insight.id}
                    className={`ie-insight-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="ie-insight-main"
                      onClick={() => selectInsight(insight.id)}
                      aria-pressed={isSelected}
                    >
                      <div className="ie-insight-top">
                        <span className="ie-insight-number">{displayNum}</span>
                        <span className="ie-participation">
                          {insight.sourceIds.length} / {model.comparedSources}{' '}
                          {labels.sourcesMeta}
                          {evidenceN > 0 && (
                            <>
                              {' · '}
                              {labels.evidenceCount} {evidenceN}
                              {model.lang === 'ko' ? '개' : ''}
                            </>
                          )}
                        </span>
                      </div>
                      <h3>{insight.title}</h3>
                      <p>{insight.summary}</p>
                      {insight.explanation && (
                        <p className="ie-insight-detail">{insight.explanation}</p>
                      )}
                    </button>
                    <div className="ie-insight-footer">
                      <div className="ie-people">
                        {sourcesForInsight.map((s) => (
                          <SourceMark key={s.id} source={s} small />
                        ))}
                        <span>{sourcesForInsight.map((s) => s.short).join(' + ')}</span>
                        <b>
                          {insight.sourceIds.length} / {model.comparedSources}{' '}
                          {labels.sourcesMeta}
                        </b>
                      </div>
                      <div className="ie-card-actions">
                        <button
                          type="button"
                          onClick={() => {
                            selectInsight(insight.id)
                            scrollToId('connect')
                          }}
                        >
                          {labels.connectView} <ArrowDown />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            selectInsight(insight.id)
                            scrollToId('verify')
                          }}
                        >
                          {labels.evidenceView} <ArrowUpRight />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {selected && (
          <>
            <section className="ie-section" id="connect">
              <SectionLabel number="02">CONNECT</SectionLabel>
              <div className="ie-section-heading">
                <div>
                  <h2>{labels.connect}</h2>
                  <p>{labels.connectSub}</p>
                </div>
                <div className="ie-graph-legend">
                  <span>
                    <i className="ie-legend-solid" />
                    {labels.legendSource}
                  </span>
                  <span>
                    <i className="ie-legend-dashed" />
                    {labels.legendAi}
                  </span>
                </div>
              </div>

              <div className="ie-graph-wrap">
                <div className="ie-mobile-path">
                  <p className="ie-path-kicker">
                    SELECTED PATH / INSIGHT {insightDisplayNumber(selected.id, 0)}
                  </p>
                  {selected.sourceConcepts.map((concept) => {
                    const source = model.sourceById.get(concept.sourceId)
                    if (!source) return null
                    return (
                      <div className="ie-path-step" key={concept.id}>
                        <div className="ie-path-source">
                          <SourceMark source={source} />
                          <span>{source.name}</span>
                        </div>
                        <ChevronRight className="ie-path-arrow" />
                        <button
                          type="button"
                          className="ie-path-concept"
                          onClick={() =>
                            setDetailNode({
                              kind: 'SOURCE_CONCEPT',
                              label: concept.label,
                              body: concept.summary ?? labels.sourceConceptOrigin,
                              sourceName: source.name,
                              evidenceRef: concept.evidenceRefs[0],
                            })
                          }
                        >
                          {concept.label}
                        </button>
                      </div>
                    )
                  })}
                  {selected.connectionConcepts[0] && (
                    <div className="ie-path-final">
                      <Sparkles />
                      {selected.connectionConcepts[0].label}
                      <small>{labels.aiConnection}</small>
                    </div>
                  )}
                  <div className="ie-path-line" />
                  <div className="ie-path-insight">
                    INSIGHT {insightDisplayNumber(selected.id, 0)}
                    <strong>{selected.title}</strong>
                  </div>
                </div>

                <div className="ie-desktop-graph">
                  <div className="ie-graph-column">
                    {participatingSources.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="ie-graph-node ie-node-source"
                        onClick={() =>
                          setDetailNode({
                            kind: 'SOURCE',
                            label: s.name,
                            body: s.title,
                            sourceName: s.name,
                          })
                        }
                      >
                        <span className="ie-node-kind">SOURCE</span>
                        <strong>{s.name}</strong>
                        <small>SOURCE {s.number}</small>
                      </button>
                    ))}
                  </div>
                  <div className="ie-edge-column">
                    {participatingSources.map((s) => <span key={s.id} />)}
                  </div>
                  <div className="ie-graph-column">
                    {selected.sourceConcepts.map((concept) => {
                      const source = model.sourceById.get(concept.sourceId)
                      const ev = firstConceptEvidence(concept, model.evidenceByRef)
                      return (
                        <button
                          key={concept.id}
                          type="button"
                          className="ie-graph-node ie-node-concept"
                          onClick={() =>
                            setDetailNode({
                              kind: 'SOURCE_CONCEPT',
                              label: concept.label,
                              body: concept.summary ?? labels.sourceConceptOrigin,
                              sourceName: source?.name,
                              evidenceRef: concept.evidenceRefs[0],
                            })
                          }
                        >
                          <span className="ie-node-kind">{labels.sourceConceptKind}</span>
                          <strong>{concept.label}</strong>
                          {ev && source && (
                            <small>
                              {source.short} · {ev.timeLabel}
                            </small>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <div className="ie-edge-column ie-center-edges">
                    {selected.sourceConcepts.map((c) => <span key={c.id} />)}
                  </div>
                  <div className="ie-graph-column">
                    {selected.connectionConcepts.map((conn) => (
                      <button
                        key={conn.id}
                        type="button"
                        className="ie-graph-node ie-node-connection"
                        onClick={() =>
                          setDetailNode({
                            kind: 'AI_CONNECTION',
                            label: conn.label,
                            body: conn.explanation,
                          })
                        }
                      >
                        <span className="ie-node-kind">{labels.aiConnection}</span>
                        <strong>{conn.label}</strong>
                        <small>AI-DERIVED</small>
                      </button>
                    ))}
                    {selected.connectionConcepts.length > 0 && (
                      <p className="ie-connection-note">{labels.connectionMeet}</p>
                    )}
                  </div>
                  <div className="ie-edge-column">
                    <span />
                  </div>
                  <div className="ie-graph-column">
                    <button
                      type="button"
                      className="ie-graph-node ie-node-insight ie-node-active"
                      onClick={() => scrollToId('trace')}
                    >
                      <span className="ie-node-kind">INSIGHT</span>
                      <strong>
                        INSIGHT {insightDisplayNumber(selected.id, 0)}
                      </strong>
                      <small>{selected.title}</small>
                    </button>
                  </div>
                </div>
              </div>

              {detailNode && (
                <aside className="ie-node-detail">
                  <button
                    type="button"
                    className="ie-detail-close"
                    onClick={() => setDetailNode(null)}
                    aria-label="닫기"
                  >
                    <X />
                  </button>
                  <span className="ie-node-kind">
                    {detailNode.kind === 'SOURCE'
                      ? 'SOURCE'
                      : detailNode.kind === 'SOURCE_CONCEPT'
                        ? labels.sourceConceptKind
                        : detailNode.kind === 'AI_CONNECTION'
                          ? labels.aiDerived
                          : 'INSIGHT'}
                  </span>
                  <h3>{detailNode.label}</h3>
                  {detailNode.sourceName && (
                    <p className="ie-detail-source">SOURCE / {detailNode.sourceName}</p>
                  )}
                  {detailNode.body && <p>{detailNode.body}</p>}
                  {detailNode.kind === 'AI_CONNECTION' && (
                    <p className="ie-ai-notice">{labels.aiNotice}</p>
                  )}
                  {detailNode.evidenceRef && model.evidenceByRef.get(detailNode.evidenceRef) && (
                    <div className="ie-detail-evidence">
                      <span>
                        {model.evidenceByRef.get(detailNode.evidenceRef)?.timeLabel}
                      </span>
                      <p>
                        &ldquo;
                        {model.evidenceByRef.get(detailNode.evidenceRef)?.quote}
                        &rdquo;
                      </p>
                      {model.evidenceByRef.get(detailNode.evidenceRef)?.watchUrl && (
                        <a
                          href={
                            model.evidenceByRef.get(detailNode.evidenceRef)?.watchUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {labels.watch} <Play />
                        </a>
                      )}
                    </div>
                  )}
                </aside>
              )}
            </section>

            <section className="ie-section" id="trace">
              <SectionLabel number="03">TRACE</SectionLabel>
              <div className="ie-section-heading">
                <div>
                  <h2>{labels.trace}</h2>
                  <p>{labels.traceSub}</p>
                </div>
                <span className="ie-selected-pill">
                  INSIGHT {insightDisplayNumber(selected.id, 0)} <ChevronRight />
                </span>
              </div>
              <div className="ie-trace-grid">
                <div className="ie-trace-steps">
                  {selected.sourceConcepts.map((concept, index) => {
                    const source = model.sourceById.get(concept.sourceId)
                    const ev = firstConceptEvidence(concept, model.evidenceByRef)
                    return (
                      <div key={concept.id}>
                        <div className="ie-trace-person">
                          {source && <SourceMark source={source} />}
                          <div>
                            <strong>{source?.name ?? concept.sourceId}</strong>
                            <p>{concept.summary ?? concept.label}</p>
                          </div>
                          {ev?.watchUrl && (
                            <a
                              className="ie-trace-timestamp"
                              href={ev.watchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {ev.timeLabel} <Play />
                            </a>
                          )}
                        </div>
                        {index < selected.sourceConcepts.length - 1 && (
                          <div className="ie-trace-connector">
                            <ArrowDown />
                            <span>{labels.link}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {selected.connectionConcepts.length > 0 && (
                    <>
                      <div className="ie-trace-connector">
                        <ArrowDown />
                        <span>{labels.interpret}</span>
                      </div>
                      <div className="ie-trace-connection">
                        <Sparkles />
                        <span>{labels.aiConnection}</span>
                        <strong>{selected.connectionConcepts[0].label}</strong>
                      </div>
                    </>
                  )}
                  <div className="ie-trace-connector">
                    <ArrowDown />
                  </div>
                  <div className="ie-trace-result">
                    <span>INSIGHT {insightDisplayNumber(selected.id, 0)}</span>
                    <strong>{selected.title}</strong>
                  </div>
                </div>
                <div className="ie-why-box">
                  <p className="ie-eyebrow">WHY CONNECTED?</p>
                  <p>
                    {selected.explanation ??
                      selected.summary ??
                      selected.connectionConcepts[0]?.explanation}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {(model.agreements.length > 0 ||
          model.disagreements.length > 0 ||
          model.complementaryViews.length > 0 ||
          model.uniqueViews.length > 0) && (
          <section className="ie-section" id="compare">
            <SectionLabel number="04">COMPARE</SectionLabel>
            <div className="ie-section-heading">
              <div>
                <h2>{labels.compare}</h2>
                <p>{labels.compareSub}</p>
              </div>
            </div>
            <div className="ie-compare-grid">
              {model.agreements.length > 0 && (
                <article>
                  <span>{labels.agree}</span>
                  {model.agreements.map((item) => (
                    <div key={item.statement}>
                      <h3>{item.statement}</h3>
                      <div className="ie-compare-people">
                        {item.sourceIds.map((id) => {
                          const s = model.sourceById.get(id)
                          return s ? <SourceMark key={id} source={s} small /> : null
                        })}
                        <span>
                          {item.sourceIds
                            .map((id) => model.sourceById.get(id)?.short ?? id)
                            .join(' + ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </article>
              )}
              {model.disagreements.length > 0 && (
                <article>
                  <span>{labels.divide}</span>
                  {model.disagreements.map((item) => (
                    <div key={item.statement}>
                      <h3>{item.statement}</h3>
                    </div>
                  ))}
                </article>
              )}
              {model.complementaryViews.length > 0 && (
                <article>
                  <span>{labels.complement}</span>
                  {model.complementaryViews.map((item) => (
                    <div key={item.statement}>
                      <h3>{item.statement}</h3>
                    </div>
                  ))}
                </article>
              )}
              {model.uniqueViews.length > 0 && (
                <article>
                  <span>{labels.unique}</span>
                  <div className="ie-unique-list">
                    {model.uniqueViews.map((item) => {
                      const sourceId = item.sourceIds[0]
                      const source = sourceId
                        ? model.sourceById.get(sourceId)
                        : undefined
                      return (
                        <p key={item.statement}>
                          {source && <b>{source.short}</b>}
                          {item.statement}
                        </p>
                      )
                    })}
                  </div>
                </article>
              )}
            </div>
          </section>
        )}

        <section className="ie-section" id="verify">
          <SectionLabel number="05">VERIFY</SectionLabel>
          <div className="ie-section-heading">
            <div>
              <h2>{labels.verify}</h2>
              <p>{labels.verifySub}</p>
            </div>
            <span className="ie-verify-note">
              <CircleHelp />
              {labels.verifyNote}
            </span>
          </div>
          <div className="ie-verify-toolbar">
            <div className="ie-filter-label">
              <Filter /> SOURCE FILTER
            </div>
            <div className="ie-filter-buttons">
              <button
                type="button"
                className={filter === 'all' ? 'ie-filter-active' : ''}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              {model.sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={filter === s.id ? 'ie-filter-active' : ''}
                  onClick={() => setFilter(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="ie-filter-active"
              onClick={() => setShowAllTranscript((v) => !v)}
            >
              {showAllTranscript ? labels.showInsightEvidence : labels.showAllTranscript}
            </button>
          </div>
          <div>
            {visibleEvidence.map((item) => {
              const source = model.sourceById.get(item.sourceId)
              return (
                <article className="ie-evidence-item" key={item.ref}>
                  {item.watchUrl ? (
                    <a
                      className="ie-evidence-time"
                      href={item.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.timeLabel}
                      <Play />
                    </a>
                  ) : (
                    <span className="ie-evidence-time">{item.timeLabel}</span>
                  )}
                  <div>
                    <p>&ldquo;{item.quote}&rdquo;</p>
                    {item.usedByInsightIds.length > 0 && (
                      <div className="ie-evidence-used">
                        <span>{labels.usedIn}</span>
                        {item.usedByInsightIds.map((insightId) => (
                          <button
                            key={insightId}
                            type="button"
                            onClick={() => {
                              selectInsight(insightId)
                              scrollToId('discover')
                            }}
                          >
                            INSIGHT {insightDisplayNumber(insightId, 0)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {source && <SourceMark source={source} small />}
                </article>
              )
            })}
          </div>
        </section>

        {!embedded && (
          <footer className="ie-footer">
            <span className="ie-wordmark">elcanto<span>·</span></span>
            <span>Ideas become visible when sources meet.</span>
            <a href="#top">
              BACK TO TOP <ArrowUpRight />
            </a>
          </footer>
        )}
      </div>
    </div>
  )
}
