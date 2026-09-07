import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'

export type RenderQualityReport = {
  ok: boolean
  filePath: string
  durationSec?: number
  width?: number
  height?: number
  hasVideo: boolean
  hasAudio: boolean
  errors: string[]
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function validateRenderWithFfprobe(filePath: string): Promise<RenderQualityReport> {
  const report: RenderQualityReport = {
    ok: false,
    filePath,
    hasVideo: false,
    hasAudio: false,
    errors: [],
  }

  if (!(await fileExists(filePath))) {
    report.errors.push('File does not exist')
    return report
  }

  return new Promise((resolve) => {
    const ffprobe = process.env.FFPROBE_PATH ?? 'ffprobe'
    const proc = spawn(ffprobe, [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type,width,height,duration',
      '-of',
      'json',
      filePath,
    ])

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    proc.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    proc.on('error', () => {
      report.errors.push('ffprobe not available')
      resolve(report)
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        report.errors.push(stderr || `ffprobe exit ${code}`)
        resolve(report)
        return
      }
      try {
        const parsed = JSON.parse(stdout) as {
          streams?: Array<{
            codec_type?: string
            width?: number
            height?: number
            duration?: string
          }>
        }
        for (const stream of parsed.streams ?? []) {
          if (stream.codec_type === 'video') {
            report.hasVideo = true
            report.width = stream.width
            report.height = stream.height
            if (stream.duration) report.durationSec = Number(stream.duration)
          }
          if (stream.codec_type === 'audio') report.hasAudio = true
        }
        if (!report.hasVideo) report.errors.push('No video stream')
        if (report.durationSec !== undefined && report.durationSec <= 0) {
          report.errors.push('Duration is zero')
        }
        report.ok = report.errors.length === 0 && report.hasVideo
      } catch {
        report.errors.push('Failed to parse ffprobe output')
      }
      resolve(report)
    })
  })
}
