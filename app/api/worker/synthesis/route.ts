import { NextResponse } from 'next/server'
import type { VideoAnalysis } from '@/lib/types/analysis'

export const maxDuration = 300

type WorkerJob = {
  synthesisId: string
  videos: Array<{
    youtubeId: string
    title: string
    channel: string
    voiceIndex: number
  }>
  topic?: string
}

export async function POST(request: Request) {
  const workerUrl = process.env.RAILWAY_WORKER_URL
  const secret = process.env.WORKER_SECRET

  if (!workerUrl || !secret) {
    return NextResponse.json({ error: 'Railway worker not configured.' }, { status: 503 })
  }

  const body = (await request.json()) as WorkerJob

  const res = await fetch(`${workerUrl}/process-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': secret,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
