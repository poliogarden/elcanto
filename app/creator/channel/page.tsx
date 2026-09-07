'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type ChannelData = {
  channel: { id: string; title: string; indexingStatus: string }
  topics: Array<{ id: string; label: string; videoIds: string[] }>
  positions: Array<{ id: string; label: string; statement: string; evidenceRef: string; timestamp: number }>
  memory?: {
    positionHistory: Array<{ label: string; statement: string; changeFromPrevious?: string; publishedAt: string; evidence: { timestampStart: number } }>
    audienceQuestions: Array<{ label: string; frequency: number; representativePhrases: string[]; trend?: string }>
    learnings: Array<{ statement: string; confidence: string }>
    openLoops?: never
  }
  brain?: { openLoops: Array<{ id: string; label: string; description: string; status?: string }> }
}

export default function CreatorChannelPage() {
  const [data, setData] = useState<ChannelData | null>(null)

  useEffect(() => {
    fetch('/api/creator/channel')
      .then((r) => r.json())
      .then(setData)
  }, [])

  const openLoops = data?.brain?.openLoops ?? []

  return (
    <div className="creator-shell">
      <nav className="creator-nav">
        <Link href="/creator">Home</Link>
        <Link href="/creator/ideas">Ideas</Link>
        <Link href="/creator/projects">Projects</Link>
        <Link href="/creator/channel">Channel</Link>
      </nav>
      <main className="creator-main creator-main-wide">
        <h1>Channel Brain</h1>
        {data?.channel && (
          <section className="creator-card">
            <h2>{data.channel.title}</h2>
            <p>Index: {data.channel.indexingStatus}</p>
          </section>
        )}

        <section className="creator-card">
          <h3>Topics</h3>
          {data?.topics.length ? (
            <ul>{data.topics.map((t) => <li key={t.id}>{t.label} ({t.videoIds.length} videos)</li>)}</ul>
          ) : (
            <p className="creator-empty">새 영상이 분석되면 여기에서 주제 클러스터를 표시합니다.</p>
          )}
        </section>

        <section className="creator-card">
          <h3>Positions</h3>
          <ul>
            {data?.positions.map((p) => (
              <li key={p.id}>
                <strong>{p.label}</strong>
                <br />
                {p.statement}
                <br />
                <span className="creator-evidence">
                  From your video · {Math.floor(p.timestamp / 60)}:{String(p.timestamp % 60).padStart(2, '0')}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="creator-card">
          <h3>Open Loops</h3>
          {openLoops.length ? (
            <ul>{openLoops.map((l) => <li key={l.id}><strong>{l.label}</strong> — {l.description}</li>)}</ul>
          ) : (
            <p className="creator-empty">새 영상이 분석되면 여기에서 후속 콘텐츠 후보를 찾습니다.</p>
          )}
        </section>

        <section className="creator-card">
          <h3>Audience</h3>
          {data?.memory?.audienceQuestions?.length ? (
            <ul>
              {data.memory.audienceQuestions.map((q) => (
                <li key={q.label}>
                  <strong>{q.label}</strong> ({q.frequency}×, {q.trend})
                  <ul>{q.representativePhrases.map((p) => <li key={p}>{p}</li>)}</ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="creator-empty">댓글 패턴이 분석되면 시청자 질문이 여기에 표시됩니다.</p>
          )}
        </section>

        <section className="creator-card">
          <h3>Position History</h3>
          {data?.memory?.positionHistory?.length ? (
            <ul>
              {data.memory.positionHistory.map((h) => (
                <li key={h.label + h.publishedAt}>
                  {h.publishedAt.slice(0, 10)} — {h.label}
                  {h.changeFromPrevious ? ` (${h.changeFromPrevious})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="creator-empty">동일 주제에 대한 주장 변화가 추적되면 여기에 표시됩니다.</p>
          )}
        </section>

        <section className="creator-card">
          <h3>Learnings</h3>
          {data?.memory?.learnings?.length ? (
            <ul>
              {data.memory.learnings.map((l) => (
                <li key={l.statement}>
                  <span className={`creator-confidence creator-confidence-${l.confidence}`}>{l.confidence.replace('_', ' ')}</span>
                  {l.statement}
                </li>
              ))}
            </ul>
          ) : (
            <p className="creator-empty">Not enough evidence yet. 게시 후 성과 데이터가 쌓이면 학습이 표시됩니다.</p>
          )}
        </section>
      </main>
    </div>
  )
}
