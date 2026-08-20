#!/usr/bin/env node
/**
 * elcanto composition render worker
 *
 * Env:
 *   PORT=8788
 *   WORKER_SECRET=...
 *   APP_URL=http://localhost:3000
 *   RENDER_OUTPUT_DIR=./render-out
 *   FFMPEG_PATH=ffmpeg
 *   YTDLP_PATH=yt-dlp
 *   RENDER_ALLOW_YTDLP=true   # local dev: auto-download YouTube sources
 */

import http from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { uploadRenderFile } from './lib/storage-upload.mjs'

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename)
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const PORT = Number(process.env.PORT ?? 8788)
const SECRET = process.env.WORKER_SECRET ?? ''
const APP_URL = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)
const OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR ?? path.join(process.cwd(), 'render-out')
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg'
const YTDLP = process.env.YTDLP_PATH ?? 'yt-dlp'
const ALLOW_YTDLP = process.env.RENDER_ALLOW_YTDLP === 'true'

const jobs = new Map()
const sourceCache = new Map()

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function persistJob(jobId, patch) {
  const existing = jobs.get(jobId) ?? {}
  const next = { ...existing, ...patch }
  jobs.set(jobId, next)

  const workDir = path.join(OUTPUT_DIR, jobId)
  await mkdir(workDir, { recursive: true })
  await writeFile(path.join(workDir, 'status.json'), JSON.stringify(next, null, 2))

  return next
}

async function loadPersistedJob(jobId) {
  if (jobs.has(jobId)) return jobs.get(jobId)
  try {
    const raw = await readFile(path.join(OUTPUT_DIR, jobId, 'status.json'), 'utf8')
    const parsed = JSON.parse(raw)
    jobs.set(jobId, parsed)
    return parsed
  } catch {
    return null
  }
}

async function notifyWebhook(webhookUrl, payload) {
  if (!webhookUrl) return
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': SECRET,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Webhook failed:', err)
  }
}

function buildTimeline(manifest) {
  const timeline = []
  for (const clip of manifest.clips) timeline.push({ kind: 'clip', clip })
  for (const interlude of manifest.interludes) timeline.push({ kind: 'interlude', interlude })
  timeline.sort((a, b) => {
    const orderA = a.kind === 'clip' ? a.clip.order : a.interlude.order
    const orderB = b.kind === 'clip' ? b.clip.order : b.interlude.order
    return orderA - orderB
  })
  return timeline
}

function buildConcatList(segments) {
  const lines = ['ffconcat version 1.0']
  for (const segment of segments) {
    lines.push(`file '${segment.file.replace(/\\/g, '/')}'`)
    lines.push(`duration ${segment.durationSeconds}`)
  }
  return lines.join('\n')
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    proc.on('close', (code) => {
      if (code === 0) resolve(stderr)
      else reject(new Error(stderr || `${command} exited ${code}`))
    })
  })
}

function runFfmpeg(args) {
  return runCommand(FFMPEG, args)
}

function escapeDrawtext(text) {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").slice(0, 120)
}

function resolveDrawtextFontfile() {
  if (process.platform !== 'win32') return null
  const candidates = [
    path.join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts', 'malgun.ttf'),
    path.join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts', 'arial.ttf'),
    path.join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts', 'segoeui.ttf'),
  ]
  for (const file of candidates) {
    if (existsSync(file)) {
      return file.replace(/\\/g, '/').replace(':', '\\:')
    }
  }
  return null
}

function drawtextFilter(text, yExpr) {
  const escaped = escapeDrawtext(text)
  const fontfile = resolveDrawtextFontfile()
  const fontPart = fontfile ? `fontfile=${fontfile}:` : ''
  return `drawtext=${fontPart}text='${escaped}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=${yExpr}`
}

async function renderBlackVideo(outputPath, durationSeconds, audioPath) {
  const duration = Math.max(3, durationSeconds)
  const args = [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=1280x720:d=${duration}`,
  ]
  if (audioPath) {
    args.push('-i', audioPath, '-shortest', '-c:a', 'aac')
  } else {
    args.push('-an')
  }
  args.push('-c:v', 'libx264', outputPath)
  await runFfmpeg(args)
  return outputPath
}

function resolveMediaUrl(url) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${APP_URL}${url}`
  return url
}

async function downloadAudio(url, dest) {
  const resolved = resolveMediaUrl(url)
  const res = await fetch(resolved)
  if (!res.ok) throw new Error(`Failed to download audio: ${resolved}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return dest
}

async function ensureYouTubeSource(youtubeId, workDir) {
  const cacheDir = path.join(workDir, 'sources')
  await mkdir(cacheDir, { recursive: true })
  const dest = path.join(cacheDir, `${youtubeId}.mp4`)

  try {
    await access(dest)
    return dest
  } catch {
    // download below
  }

  if (!ALLOW_YTDLP) {
    throw new Error(
      `Missing source file ${dest}. Set RENDER_ALLOW_YTDLP=true and install yt-dlp for local dev.`,
    )
  }

  const cacheKey = `${workDir}:${youtubeId}`
  if (sourceCache.has(cacheKey)) {
    await sourceCache.get(cacheKey)
    await access(dest)
    return dest
  }

  const downloadPromise = runCommand(YTDLP, [
    '-f',
    'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    '--merge-output-format',
    'mp4',
    '--no-playlist',
    '-o',
    dest,
    `https://www.youtube.com/watch?v=${youtubeId}`,
  ])
  sourceCache.set(cacheKey, downloadPromise)

  try {
    await downloadPromise
    await access(dest)
    return dest
  } finally {
    sourceCache.delete(cacheKey)
  }
}

async function renderInterlude(interlude, outputPath) {
  const duration = Math.max(3, interlude.durationSeconds)
  const text = interlude.text?.trim()
  let audioPath

  if (interlude.audioUrl) {
    audioPath = `${outputPath}.mp3`
    try {
      await downloadAudio(interlude.audioUrl, audioPath)
    } catch {
      audioPath = undefined
    }
  }

  if (text) {
    try {
      const vf = drawtextFilter(text, audioPath ? 'h-120' : '(h-text_h)/2')
      const args = [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `color=c=black:s=1280x720:d=${duration}`,
      ]
      if (audioPath) {
        args.push('-i', audioPath, '-shortest', '-vf', vf, '-c:v', 'libx264', '-c:a', 'aac', outputPath)
      } else {
        args.push('-vf', vf, '-c:v', 'libx264', '-an', outputPath)
      }
      await runFfmpeg(args)
      return outputPath
    } catch (err) {
      console.warn('[render] drawtext interlude failed, using black card:', err instanceof Error ? err.message.slice(0, 120) : err)
    }
  }

  await renderBlackVideo(outputPath, duration, audioPath)
  return outputPath
}

async function processRenderJob({ jobId, manifest, ffmpegScript, webhookUrl }) {
  const notify = (patch) => notifyWebhook(webhookUrl, { jobId, ...patch })

  try {
  const workDir = path.join(OUTPUT_DIR, jobId)
  const segmentsDir = path.join(workDir, 'segments')
  await mkdir(segmentsDir, { recursive: true })
  await mkdir(path.join(workDir, 'out'), { recursive: true })

  await persistJob(jobId, { status: 'processing', progress: 10, progressLabel: 'Saving manifest' })
  await notify({ status: 'processing', progress: 10, progressLabel: 'Saving manifest' })

  await writeFile(path.join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  if (ffmpegScript) await writeFile(path.join(workDir, 'render-plan.sh'), ffmpegScript)

  const timeline = buildTimeline(manifest)
  const segments = []
  let clipIndex = 0

  for (let i = 0; i < timeline.length; i += 1) {
    const entry = timeline[i]
    const segName = `seg_${String(i + 1).padStart(2, '0')}.mp4`
    const output = path.join(segmentsDir, segName)

    if (entry.kind === 'clip') {
      clipIndex += 1
      const clip = entry.clip

      await persistJob(jobId, {
        status: 'processing',
        progress: 15 + clipIndex * 8,
        progressLabel: `Clip ${clipIndex}/${manifest.clips.length}`,
      })
      await notify({
        status: 'processing',
        progress: 15 + clipIndex * 8,
        progressLabel: `Clip ${clipIndex}/${manifest.clips.length}`,
      })

      const input = await ensureYouTubeSource(clip.youtubeId, workDir)
      await runFfmpeg([
        '-y',
        '-ss',
        String(clip.startSeconds),
        '-to',
        String(clip.endSeconds),
        '-i',
        input,
        '-c',
        'copy',
        output,
      ])

      segments.push({ file: output, durationSeconds: clip.durationSeconds })
    } else {
      await persistJob(jobId, {
        status: 'processing',
        progress: 55 + i * 3,
        progressLabel: 'Rendering interlude',
      })
      await notify({
        status: 'processing',
        progress: 55 + i * 3,
        progressLabel: 'Rendering interlude',
      })

      await renderInterlude(entry.interlude, output)
      segments.push({ file: output, durationSeconds: entry.interlude.durationSeconds })
    }
  }

  const concatPath = path.join(workDir, 'concat.txt')
  await writeFile(concatPath, buildConcatList(segments))

  const outFile = path.join(workDir, 'out', `${manifest.compositionId}.mp4`)
  await persistJob(jobId, { status: 'processing', progress: 85, progressLabel: 'Concatenating' })
  await notify({ status: 'processing', progress: 85, progressLabel: 'Concatenating' })

  try {
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', outFile])

    const mp4 = await readFile(outFile)
    const uploaded = await uploadRenderFile(jobId, `${manifest.compositionId}.mp4`, mp4, 'video/mp4')

    const localFileUrl = `/files/${jobId}/${manifest.compositionId}.mp4`
    const complete = {
      status: 'complete',
      progress: 100,
      progressLabel: 'Complete',
      outputUrl: uploaded?.url ?? localFileUrl,
      outputPath: outFile,
      message: 'Render complete.',
    }
    await persistJob(jobId, complete)
    await notify({ jobId, ...complete })
  } catch (err) {
    const failed = {
      status: 'failed',
      error: err instanceof Error ? err.message : 'FFmpeg concat failed.',
      progress: 100,
    }
    await persistJob(jobId, failed)
    await notify({ jobId, ...failed })
  }
  } catch (err) {
    const failed = {
      status: 'failed',
      error: err instanceof Error ? err.message.slice(0, 500) : 'Render job failed.',
      progress: 100,
    }
    await persistJob(jobId, failed)
    await notify({ jobId, ...failed })
    console.error('[render] job failed:', jobId, err)
  }
}

async function serveFile(jobId, filename, res) {
  if (!/^[\w.-]+$/.test(filename)) {
    return json(res, 400, { error: 'Invalid filename.' })
  }

  const filePath = path.join(OUTPUT_DIR, jobId, 'out', filename)
  try {
    const body = await readFile(filePath)
    const contentType = filename.endsWith('.mp4')
      ? 'video/mp4'
      : filename.endsWith('.mp3')
        ? 'audio/mpeg'
        : 'application/octet-stream'

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    })
    res.end(body)
  } catch {
    json(res, 404, { error: 'File not found.' })
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, allowYtdlp: ALLOW_YTDLP })
  }

  if (req.method === 'GET' && req.url?.startsWith('/files/')) {
    const parts = req.url.split('/').filter(Boolean)
    if (parts.length === 3) {
      return serveFile(parts[1], parts[2], res)
    }
    return json(res, 404, { error: 'Not found' })
  }

  if (req.headers['x-worker-secret'] !== SECRET) {
    return json(res, 401, { error: 'Unauthorized' })
  }

  if (req.method === 'POST' && req.url === '/render-composition') {
    try {
      const body = JSON.parse(await readBody(req))
      const { jobId, manifest, ffmpegScript, webhookUrl } = body
      if (!jobId || !manifest) {
        return json(res, 400, { error: 'jobId and manifest required.' })
      }

      await persistJob(jobId, { status: 'queued', progress: 0, progressLabel: 'Queued' })
      void processRenderJob({ jobId, manifest, ffmpegScript, webhookUrl })

      return json(res, 202, {
        status: 'processing',
        message: 'Render job accepted. Poll GET /render-status/:jobId',
        jobId,
      })
    } catch (err) {
      return json(res, 500, { error: err instanceof Error ? err.message : 'Invalid body' })
    }
  }

  if (req.method === 'GET' && req.url?.startsWith('/render-status/')) {
    const jobId = req.url.split('/render-status/')[1]?.split('?')[0]
    const job = (await loadPersistedJob(jobId)) ?? jobs.get(jobId)
    if (!job) return json(res, 404, { error: 'Job not found.' })
    return json(res, 200, job)
  }

  json(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`elcanto render worker listening on :${PORT}`)
  if (ALLOW_YTDLP) {
    console.log('yt-dlp auto-download enabled (RENDER_ALLOW_YTDLP=true)')
  }
})
