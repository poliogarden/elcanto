import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runSynthesisJob } from '@/lib/synthesis/synthesis-job-runner'
import { saveSynthesisJob } from '@/lib/synthesis/synthesis-job-repository'
import type { SynthesisJob } from '@/lib/synthesis/synthesis-job-types'
import * as localStore from '@/lib/synthesis/synthesis-job-store'

export const maxDuration = 300

const STALE_QUEUED_MS = 60_000

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function listStaleQueuedJobs(): Promise<SynthesisJob[]> {
  const cutoff = Date.now() - STALE_QUEUED_MS
  const stale: SynthesisJob[] = []

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('synthesis_jobs')
      .select('*')
      .eq('status', 'queued')
      .lt('created_at', new Date(cutoff).toISOString())
      .limit(20)

    for (const row of data ?? []) {
      stale.push({
        id: String(row.id),
        synthesisId: String(row.synthesis_id),
        status: 'queued',
        phase: row.phase as SynthesisJob['phase'],
        analyzeCompleted: Number(row.analyze_completed ?? 0),
        analyzeTotal: Number(row.analyze_total ?? 0),
        draft: row.draft as SynthesisJob['draft'],
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })
    }
    return stale
  }

  try {
    const { readdir } = await import('fs/promises')
    const entries = await readdir(`${process.cwd()}/.data/synthesis-jobs`, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const job = await localStore.loadSynthesisJobLocal(entry.name)
      if (!job || job.status !== 'queued') continue
      if (new Date(job.createdAt).getTime() < cutoff) stale.push(job)
    }
  } catch {
    // no local jobs dir
  }

  return stale
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const stale = await listStaleQueuedJobs()
  for (const job of stale) {
    await saveSynthesisJob(job)
    after(async () => {
      await runSynthesisJob(job.id)
    })
  }

  return NextResponse.json({ resumed: stale.length, jobIds: stale.map((j) => j.id) })
}
