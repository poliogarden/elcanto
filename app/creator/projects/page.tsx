'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Project = { id: string; topic: string; status: string; stage: string; updatedAt: string }

export default function CreatorProjectsPage() {
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
        <Link href="/creator/ideas">Ideas</Link>
        <Link href="/creator/projects">Projects</Link>
        <Link href="/creator/channel">Channel</Link>
      </nav>
      <main className="creator-main">
        <h1>Projects</h1>
        {projects.length === 0 ? (
          <p className="creator-card creator-empty">아직 프로젝트가 없습니다. Home에서 Start video를 눌러보세요.</p>
        ) : (
          projects.map((p) => (
            <article key={p.id} className="creator-card">
              <h3><Link href={`/creator/project/${p.id}`}>{p.topic}</Link></h3>
              <p>{p.status} · {p.stage}</p>
            </article>
          ))
        )}
      </main>
    </div>
  )
}
