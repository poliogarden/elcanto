'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type WhyData = {
  why: {
    openLoops: string[]
    positions: string[]
    audience: string[]
    performance: string[]
    evidence: string[]
  }
  signals: Record<string, number>
  signalNote: string
  linkedPositions: Array<{ label: string; statement: string; evidenceLink: string }>
  positionHistory: Array<{ label: string; changeFromPrevious?: string; publishedAt: string }>
  learnings: Array<{ statement: string; confidence: string }>
}

type HomeData = {
  channel: { id: string; title: string; indexingStatus: string }
  recommended: {
    id: string
    title: string
    thesis: string
    whyNow: string[]
  } | null
  opportunities: Array<{ id: string; title: string; strength: number }>
  activeProjects: Array<{ id: string; topic: string; status: string; stage: string }>
  latestLearning: { statement: string; confidence: string } | null
  latestPerformance: { avgViewsPerDay?: number; avgRetention30s?: number } | null
  insight: string | null
}

export function CreatorHome() {
  const router = useRouter()
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [starting, setStarting] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [whyData, setWhyData] = useState<WhyData | null>(null)

  useEffect(() => {
    fetch('/api/creator/home')
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  async function startVideo(opportunityId?: string) {
    if (!data?.channel) return
    setStarting(true)
    try {
      const res = await fetch('/api/creator/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: data.channel.id,
          opportunityId,
          autoGenerate: true,
        }),
      })
      const json = await res.json()
      if (json.project?.id) router.push(`/creator/project/${json.project.id}`)
    } finally {
      setStarting(false)
    }
  }

  async function autoMakeVideo() {
    setStarting(true)
    try {
      const res = await fetch('/api/creator/auto-video', { method: 'POST' })
      const json = await res.json()
      if (json.project?.id) router.push(`/creator/project/${json.project.id}`)
    } finally {
      setStarting(false)
    }
  }

  async function showWhy(opportunityId: string) {
    const res = await fetch(`/api/creator/opportunities/${opportunityId}/why`)
    const json = await res.json()
    setWhyData(json)
    setWhyOpen(true)
  }

  async function submitPrompt() {
    if (!prompt.trim()) return
    if (/다음 영상|make.*video|만들어/i.test(prompt)) {
      await autoMakeVideo()
      return
    }
    await startVideo(data?.recommended?.id)
  }

  if (loading) return <div className="creator-shell">Loading…</div>

  return (
    <div className="creator-shell">
      <nav className="creator-nav">
        <Link href="/creator">Home</Link>
        <Link href="/creator/ideas">Ideas</Link>
        <Link href="/creator/projects">Projects</Link>
        <Link href="/creator/content">Content</Link>
        <Link href="/creator/channel">Channel</Link>
      </nav>

      <main className="creator-main creator-main-wide">
        <h1>What should we make next?</h1>
        <div className="creator-prompt">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitPrompt()}
            placeholder="다음 영상 하나 만들어줘"
          />
          <button type="button" className="creator-btn-primary" onClick={submitPrompt} disabled={starting}>
            Go
          </button>
        </div>

        {data?.insight && (
          <section className="creator-card creator-insight">
            <h2>Channel Insight</h2>
            <p>{data.insight}</p>
          </section>
        )}

        {data?.recommended && (
          <section className="creator-card creator-recommended">
            <h2>Recommended Next</h2>
            <h3>{data.recommended.title}</h3>
            <p>{data.recommended.thesis}</p>
            <ul>
              {data.recommended.whyNow.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <div className="creator-actions">
              <button type="button" className="creator-btn-secondary" onClick={() => showWhy(data.recommended!.id)}>
                Why this?
              </button>
              <button type="button" className="creator-btn-primary" disabled={starting} onClick={() => startVideo(data.recommended!.id)}>
                Start video
              </button>
            </div>
          </section>
        )}

        {data?.activeProjects && data.activeProjects.length > 0 && (
          <section className="creator-card">
            <h2>Current Projects</h2>
            {data.activeProjects.map((p) => (
              <p key={p.id}>
                <Link href={`/creator/project/${p.id}`}>{p.topic}</Link> — {p.status} / {p.stage}
              </p>
            ))}
          </section>
        )}

        {(data?.latestLearning || data?.latestPerformance) && (
          <section className="creator-card">
            <h2>What we&apos;re learning</h2>
            {data.latestLearning && (
              <p>
                <span className={`creator-confidence creator-confidence-${data.latestLearning.confidence}`}>
                  {data.latestLearning.confidence.replace('_', ' ')}
                </span>
                {data.latestLearning.statement}
              </p>
            )}
            {data.latestPerformance && (
              <p className="creator-meta">
                Baseline: ~{data.latestPerformance.avgViewsPerDay?.toLocaleString()} views/day ·{' '}
                {Math.round((data.latestPerformance.avgRetention30s ?? 0) * 100)}% 30s retention
              </p>
            )}
          </section>
        )}

        <section className="creator-opportunities">
          <h2>Other Opportunities</h2>
          {data?.opportunities.slice(1).map((o) => (
            <article key={o.id} className="creator-card creator-opp-row">
              <div>
                <h3>{o.title}</h3>
                <p className="creator-meta">Strength: {(o.strength * 100).toFixed(0)}%</p>
              </div>
              <div className="creator-actions">
                <button type="button" className="creator-btn-secondary" onClick={() => showWhy(o.id)}>Why?</button>
                <button type="button" onClick={() => startVideo(o.id)}>Start</button>
              </div>
            </article>
          ))}
        </section>
      </main>

      {whyOpen && whyData && (
        <div className="creator-modal-overlay" onClick={() => setWhyOpen(false)}>
          <div className="creator-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Why this?</h2>
            <p className="creator-meta">{whyData.signalNote}</p>
            {whyData.signals && (
              <ul className="creator-signals">
                {Object.entries(whyData.signals).map(([k, v]) => (
                  <li key={k}>{k}: {(v * 100).toFixed(0)}</li>
                ))}
              </ul>
            )}
            {whyData.why?.positions?.length > 0 && (
              <>
                <h3>Your past positions</h3>
                <ul>{whyData.why.positions.map((p) => <li key={p}>{p}</li>)}</ul>
              </>
            )}
            {whyData.linkedPositions?.map((p) => (
              <p key={p.label} className="creator-evidence">{p.evidenceLink} — {p.label}</p>
            ))}
            {whyData.why?.audience?.length > 0 && (
              <>
                <h3>Audience</h3>
                <ul>{whyData.why.audience.map((a) => <li key={a}>{a}</li>)}</ul>
              </>
            )}
            {whyData.positionHistory?.length > 0 && (
              <>
                <h3>Position history</h3>
                <ul>
                  {whyData.positionHistory.map((h) => (
                    <li key={h.label}>{h.publishedAt.slice(0, 10)}: {h.label} {h.changeFromPrevious ? `(${h.changeFromPrevious})` : ''}</li>
                  ))}
                </ul>
              </>
            )}
            <button type="button" className="creator-btn-secondary" onClick={() => setWhyOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
