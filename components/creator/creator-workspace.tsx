'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { VideoProject } from '@/lib/creator/types'
import './creator.css'

const STEPS = ['Research', 'Angle', 'Outline', 'Script', 'Scenes', 'Timeline', 'Preview', 'Publish']

export function CreatorWorkspace({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<VideoProject | null>(null)
  const [tab, setTab] = useState('Script')
  const [aiInput, setAiInput] = useState('')
  const [message, setMessage] = useState('')
  const [mutationPreview, setMutationPreview] = useState('')
  const [undoVersionId, setUndoVersionId] = useState<string | null>(null)
  const [renderUrl, setRenderUrl] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const [contradictions, setContradictions] = useState<
    Array<{
      pastStatement: string
      pastEvidenceRef: string
      currentText: string
      confidence: string
    }>
  >([])

  const load = useCallback(() => {
    fetch(`/api/creator/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project))
  }, [projectId])

  const loadContradictions = useCallback(() => {
    fetch(`/api/creator/projects/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'contradictions' }),
    })
      .then((r) => r.json())
      .then((d) => setContradictions(d.alerts ?? []))
      .catch(() => setContradictions([]))
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (project && tab === 'Script') loadContradictions()
  }, [project, tab, loadContradictions])

  async function sendAi() {
    if (!aiInput.trim()) return
    const res = await fetch(`/api/creator/projects/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ai', command: aiInput }),
    })
    const json = await res.json()
    setProject(json.project)
    setMessage(json.message ?? '')
    setMutationPreview(json.mutationPreview ?? '')
    setUndoVersionId(json.undoVersionId ?? null)
    setAiInput('')
  }

  async function undoLast() {
    if (!undoVersionId) return
    const res = await fetch(`/api/creator/projects/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'undo', versionId: undoVersionId }),
    })
    const json = await res.json()
    setProject(json.project)
    setUndoVersionId(null)
    setMessage('변경을 되돌렸습니다.')
  }

  async function publishPrep() {
    const res = await fetch(`/api/creator/projects/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish-prep' }),
    })
    const json = await res.json()
    setProject(json.project)
    setMessage('Publish metadata generated')
    setTab('Publish')
  }

  async function startRender(draft = true) {
    setPolling(true)
    const res = await fetch(`/api/creator/projects/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'render', draft }),
    })
    const json = await res.json()
    setProject(json.project)
    const jobId = json.job?.id
    if (!jobId) return

    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const statusRes = await fetch(`/api/creator/render/${jobId}`)
      const status = await statusRes.json()
      if (status.status === 'READY' && status.outputUrl) {
        setRenderUrl(status.outputUrl)
        setPolling(false)
        load()
        return
      }
      if (status.status === 'FAILED') {
        setMessage(status.error ?? 'Render failed')
        setPolling(false)
        return
      }
    }
    setPolling(false)
  }

  if (!project) return <div className="creator-shell">Loading project…</div>

  const latestVersion = project.renderVersions[project.renderVersions.length - 1]

  return (
    <div className="creator-workspace">
      <aside className="creator-ws-left">
        <Link href="/creator">← Home</Link>
        <h2>{project.topic}</h2>
        <nav>
          {STEPS.map((s) => (
            <button
              key={s}
              type="button"
              className={tab === s ? 'active' : ''}
              onClick={() => setTab(s)}
            >
              {s}
            </button>
          ))}
        </nav>
        <ul className="creator-scene-list">
          {project.scenes.map((s) => (
            <li key={s.sceneId}>
              {s.order + 1}. {s.visualIntent.slice(0, 40)}
            </li>
          ))}
        </ul>
      </aside>

      <section className="creator-ws-center">
        {tab === 'Preview' || renderUrl ? (
          <div className="creator-preview">
            {renderUrl ? (
              <video src={renderUrl} controls className="creator-video" />
            ) : (
              <p>{polling ? 'Rendering…' : 'No preview yet'}</p>
            )}
            <button type="button" onClick={() => startRender(true)} disabled={polling}>
              Draft render
            </button>
            <button type="button" onClick={() => startRender(false)} disabled={polling}>
              Final render
            </button>
            <button type="button" onClick={publishPrep}>
              Prepare publish
            </button>
          </div>
        ) : (
          <div className="creator-artifact">
            {tab === 'Script' && contradictions.length > 0 && (
              <div className="creator-contradiction-panel">
                <h4>Potential position change detected</h4>
                {contradictions.map((c, i) => (
                  <div key={i} className="creator-contradiction-item">
                    <p className="creator-confidence">{c.confidence} evidence</p>
                    <p><strong>Past:</strong> {c.pastStatement}</p>
                    <p className="creator-evidence-ref">{c.pastEvidenceRef}</p>
                    <p><strong>Current:</strong> {c.currentText.slice(0, 160)}…</p>
                    <p className="creator-contradiction-hint">
                      Explain the change · Keep new position · Revise current script
                    </p>
                  </div>
                ))}
              </div>
            )}
            <pre>{JSON.stringify(
              tab === 'Script'
                ? project.script
                : tab === 'Outline'
                  ? project.outline
                  : tab === 'Angle'
                    ? project.angle
                    : tab === 'Research'
                      ? project.research
                      : tab === 'Timeline'
                        ? project.timeline
                        : project.scenes,
              null,
              2,
            )}</pre>
          </div>
        )}
        {latestVersion && <p className="creator-version">Latest: {latestVersion.label}</p>}
        {project.generationCost && (
          <p className="creator-version">
            Cost: {project.generationCost.generatedImages} img · {project.generationCost.ttsWords} words · ~
            {Math.round(project.generationCost.estimatedDurationSec)}s
          </p>
        )}
      </section>

      <aside className="creator-ws-right">
        <h3>AI Creator Assistant</h3>
        {message && <p className="creator-ai-msg">{message}</p>}
        {mutationPreview && <p className="creator-ai-preview">{mutationPreview}</p>}
        {undoVersionId && (
          <button type="button" className="creator-btn-secondary" onClick={undoLast}>Undo</button>
        )}
        <textarea
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="인트로를 절반으로 줄여줘"
          rows={4}
        />
        <button type="button" onClick={sendAi}>Send</button>
      </aside>
    </div>
  )
}
