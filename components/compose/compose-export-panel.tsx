'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { loadRenderJob, saveRenderJob } from '@/lib/storage/compose-session'
import type { Composition, RenderJob } from '@/lib/types/composition'
import type { RenderManifest } from '@/lib/compose/render-manifest'
import { YOUTUBE_UPLOAD_SCOPES } from '@/lib/youtube/scopes'
import type { YouTubeUploadPrivacy } from '@/lib/youtube/upload-video'

type Props = {
  composition: Composition
  compositionId: string
}

export function ComposeExportPanel({ composition, compositionId }: Props) {
  const { data: session } = useSession()
  const [job, setJob] = useState<RenderJob | null>(null)
  const [cachedJob, setCachedJob] = useState<RenderJob | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ffmpegScript, setFfmpegScript] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{ watchUrl: string } | null>(null)
  const [privacyStatus, setPrivacyStatus] = useState<YouTubeUploadPrivacy>('private')
  const [manifest, setManifest] = useState<RenderManifest | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const match = Object.keys(localStorage)
      .filter((k) => k.startsWith('elcanto-render-'))
      .map((k) => loadRenderJob(k.replace('elcanto-render-', '')))
      .find((j) => j?.compositionId === compositionId)
    if (match) setCachedJob(match)
  }, [compositionId])

  useEffect(() => {
    if (!job || job.status === 'complete' || job.status === 'failed') return

    const timer = window.setInterval(async () => {
      const res = await fetch(`/api/compose/render/${job.id}`)
      if (!res.ok) return

      const data = (await res.json()) as {
        job?: RenderJob
        ffmpegScript?: string
        manifest?: RenderManifest
      }

      if (data.job) {
        setJob(data.job)
        saveRenderJob(data.job)
      }
      if (data.ffmpegScript) setFfmpegScript(data.ffmpegScript)
      if (data.manifest) setManifest(data.manifest)
    }, 1500)

    return () => window.clearInterval(timer)
  }, [job])

  useEffect(() => {
    const activeJob = job ?? cachedJob
    if (!activeJob || manifest) return
    void fetch(`/api/compose/render/${activeJob.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { manifest?: RenderManifest } | null) => {
        if (data?.manifest) setManifest(data.manifest)
      })
      .catch(() => undefined)
  }, [job, cachedJob, manifest])

  async function handleExport() {
    setExporting(true)
    setError(null)
    setFfmpegScript(null)
    setUploadResult(null)
    setUploadError(null)

    try {
      const res = await fetch('/api/compose/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composition, compositionId }),
      })

      const data = (await res.json()) as {
        job?: RenderJob
        message?: string
        error?: string
      }

      if (!res.ok || !data.job) {
        throw new Error(data.error ?? 'Export failed.')
      }

      setJob(data.job)
      saveRenderJob(data.job)

      const detailRes = await fetch(`/api/compose/render/${data.job.id}`)
      if (detailRes.ok) {
        const detail = (await detailRes.json()) as {
          ffmpegScript?: string
          job?: RenderJob
          manifest?: RenderManifest
        }
        if (detail.ffmpegScript) setFfmpegScript(detail.ffmpegScript)
        if (detail.job) {
          setJob(detail.job)
          saveRenderJob(detail.job)
        }
        if (detail.manifest) setManifest(detail.manifest)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  function downloadFfmpegScript() {
    if (!ffmpegScript || !job) return
    const blob = new Blob([ffmpegScript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${job.compositionId}-render-plan.sh`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function connectYouTubeUpload() {
    await signIn(
      'google',
      { callbackUrl: window.location.href },
      { scope: YOUTUBE_UPLOAD_SCOPES, access_type: 'offline', prompt: 'consent' },
    )
  }

  async function handleYouTubeUpload() {
    const displayJob = job ?? cachedJob
    if (!displayJob?.outputUrl) return

    setUploading(true)
    setUploadError(null)

    try {
      const res = await fetch('/api/compose/youtube-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: displayJob.id,
          privacyStatus,
          title: composition.title,
        }),
      })

      const data = (await res.json()) as { watchUrl?: string; error?: string }
      if (!res.ok || !data.watchUrl) {
        throw new Error(data.error ?? 'YouTube upload failed.')
      }

      setUploadResult({ watchUrl: data.watchUrl })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'YouTube upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const displayJob = job ?? cachedJob
  const mp4Ready = Boolean(displayJob?.outputUrl && displayJob.status === 'complete')
  const canUpload = Boolean(session?.user?.youtubeUploadConnected)
  const interludeTracks =
    manifest?.interludes.filter((interlude) => interlude.audioUrl) ?? []

  return (
    <section className="border border-line bg-paper-2 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="mono-label text-[10px] text-ink-soft">EXPORT</span>
          <h3 className="mt-2 font-serif text-2xl font-medium">Render to MP4</h3>
          <p className="mt-3 max-w-2xl font-serif text-base text-ink-soft">
            Local dev: run <code className="mono text-[11px]">pnpm dev:render-worker</code> with{' '}
            <code className="mono text-[11px]">WORKER_SECRET</code> and{' '}
            <code className="mono text-[11px]">RENDER_ALLOW_YTDLP=true</code>. The worker downloads
            clips, renders interludes, and concatenates an MP4.
          </p>
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void handleExport()}
          className="mono-label shrink-0 bg-ink px-5 py-3 text-[10px] text-background hover:opacity-90 disabled:opacity-40"
        >
          {exporting ? 'Rendering…' : 'Export MP4'}
        </button>
      </div>

      {error && (
        <p className="mono mt-4 border border-line bg-background p-3 text-[11px] text-ink-soft">
          {error}
        </p>
      )}

      {displayJob && (
        <div className="mono mt-6 space-y-2 border-t border-line pt-6 text-[11px]">
          <p>
            <span className="text-ink-soft">Job</span> {displayJob.id.slice(0, 8)}…
          </p>
          <p>
            <span className="text-ink-soft">Status</span> {displayJob.status}
            {displayJob.progressLabel ? ` — ${displayJob.progressLabel}` : ''}
          </p>
          {typeof displayJob.progress === 'number' && (
            <div className="mt-2 h-1 max-w-md bg-line">
              <div
                className="h-full bg-ink transition-all"
                style={{ width: `${Math.min(100, displayJob.progress)}%` }}
              />
            </div>
          )}
          {displayJob.message && <p className="text-ink-soft">{displayJob.message}</p>}
          {displayJob.error && <p className="text-ink-soft">{displayJob.error}</p>}
          {mp4Ready && displayJob.outputUrl && (
            <a
              href={displayJob.outputUrl}
              className="mono-label mt-3 inline-block border border-line bg-background px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              Download MP4
            </a>
          )}
          {ffmpegScript && (
            <button
              type="button"
              onClick={downloadFfmpegScript}
              className="mono-label ml-2 mt-3 border border-line bg-background px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              Advanced: FFmpeg plan (.sh)
            </button>
          )}
          {interludeTracks.length > 0 && displayJob && (
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <p className="mono-label text-[10px] text-ink-soft">INTERLUDE MP3</p>
              {interludeTracks.map((interlude, index) => (
                <a
                  key={interlude.id}
                  href={interlude.audioUrl}
                  className="mono-label block border border-line bg-background px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
                >
                  Download narration {index + 1} (.mp3)
                </a>
              ))}
              <p className="mono text-[10px] text-ink-soft">
                Files also saved under{' '}
                <code className="text-[10px]">.data/render-jobs/{displayJob.id}/assets/</code>
              </p>
            </div>
          )}
        </div>
      )}

      {mp4Ready && (
        <div className="mt-8 border-t border-line pt-6">
          <span className="mono-label text-[10px] text-ink-soft">YOUTUBE</span>
          <h4 className="mt-2 font-serif text-xl font-medium">Upload to your channel</h4>
          <p className="mt-2 max-w-2xl font-serif text-sm text-ink-soft">
            Uploads as a private video by default. Source attribution is included in the
            description.
          </p>

          {!session?.user ? (
            <button
              type="button"
              onClick={() => void signIn('google')}
              className="mono-label mt-4 border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              Sign in to upload
            </button>
          ) : !canUpload ? (
            <button
              type="button"
              onClick={() => void connectYouTubeUpload()}
              className="mono-label mt-4 border border-line px-4 py-2 text-[10px] hover:bg-ink hover:text-background"
            >
              Connect YouTube upload permission
            </button>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="mono-label text-[10px] text-ink-soft">
                Visibility
                <select
                  value={privacyStatus}
                  onChange={(e) => setPrivacyStatus(e.target.value as YouTubeUploadPrivacy)}
                  className="mono-label ml-2 border border-line bg-background px-2 py-1 text-[10px] text-ink"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleYouTubeUpload()}
                className="mono-label bg-ink px-4 py-2 text-[10px] text-background hover:opacity-90 disabled:opacity-40"
              >
                {uploading ? 'Uploading…' : 'Upload to YouTube'}
              </button>
            </div>
          )}

          {uploadError && (
            <p className="mono mt-3 border border-line bg-background p-3 text-[11px] text-ink-soft">
              {uploadError}
            </p>
          )}
          {uploadResult && (
            <p className="mono mt-3 text-[11px]">
              Uploaded:{' '}
              <a href={uploadResult.watchUrl} className="underline hover:text-ink" target="_blank" rel="noreferrer">
                {uploadResult.watchUrl}
              </a>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
