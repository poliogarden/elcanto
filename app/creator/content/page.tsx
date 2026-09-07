'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Project = {
  id: string
  topic: string
  status: string
  stage: string
  updatedAt: string
}

export default function CreatorContentPage() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    fetch('/api/creator/content')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
  }, [])

  return (
    <div className="creator-shell">
      <nav className="creator-nav">
        <Link href="/creator">Home</Link>
        <Link href="/creator/content">Content</Link>
        <Link href="/creator/ideas">Ideas</Link>
        <Link href="/creator/channel">Channel</Link>
      </nav>
      <main className="creator-main">
        <h1>Content Library</h1>
        {projects.length === 0 ? (
          <p className="creator-card">No projects yet. Start from Home.</p>
        ) : (
          projects.map((p) => (
            <article key={p.id} className="creator-card">
              <h3>{p.topic}</h3>
              <p>{p.status} · {p.stage}</p>
              <Link href={`/creator/project/${p.id}`}>Open workspace →</Link>
            </article>
          ))
        )}
      </main>
    </div>
  )
}
