'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Opportunity = {
  id: string
  title: string
  thesis: string
  strength: number
}

export default function CreatorIdeasPage() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [channelId, setChannelId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/creator/ideas')
      .then((r) => r.json())
      .then((d) => {
        setOpportunities(d.opportunities ?? [])
        setChannelId(d.channel?.id ?? null)
      })
  }, [])

  async function start(oppId: string) {
    if (!channelId) return
    const res = await fetch('/api/creator/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, opportunityId: oppId, autoGenerate: true }),
    })
    const json = await res.json()
    if (json.project?.id) router.push(`/creator/project/${json.project.id}`)
  }

  return (
    <div className="creator-shell">
      <nav className="creator-nav">
        <Link href="/creator">Home</Link>
        <Link href="/creator/content">Content</Link>
        <Link href="/creator/ideas">Ideas</Link>
        <Link href="/creator/channel">Channel</Link>
      </nav>
      <main className="creator-main">
        <h1>Ideas</h1>
        {opportunities.map((o) => (
          <article key={o.id} className="creator-card">
            <h3>{o.title}</h3>
            <p>{o.thesis}</p>
            <p>Strength: {(o.strength * 100).toFixed(0)}%</p>
            <button type="button" className="creator-btn-primary" onClick={() => start(o.id)}>
              Start video
            </button>
          </article>
        ))}
      </main>
    </div>
  )
}
