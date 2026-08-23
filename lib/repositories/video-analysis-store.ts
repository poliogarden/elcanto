import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import path from 'path'
import {
  AI_CONFIG,
  ANALYSIS_SCHEMA_VERSION,
  ANALYSIS_VERSION,
  isAnalysisCacheCompatible,
} from '@/lib/ai/config'
import type { SourceAnalysis } from '@/lib/types/source'

const ANALYSES_DIR = path.join(process.cwd(), '.data', 'video-analyses')

export type StoredVideoAnalysis = {
  youtubeId: string
  analysisVersion: string
  schemaVersion: string
  coveragePromptVersion: string
  cachedAt: string
  analysis: SourceAnalysis
}

const writeLocks = new Map<string, Promise<unknown>>()

function safeFileName(youtubeId: string): string {
  return youtubeId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function analysisFilePath(youtubeId: string): string {
  return path.join(ANALYSES_DIR, `${safeFileName(youtubeId)}.json`)
}

async function withWriteLock<T>(youtubeId: string, fn: () => Promise<T>): Promise<T> {
  const tail = writeLocks.get(youtubeId) ?? Promise.resolve()
  let result!: T
  const run = tail.then(async () => {
    result = await fn()
    return result
  })
  writeLocks.set(youtubeId, run)
  try {
    await run
    return result
  } finally {
    if (writeLocks.get(youtubeId) === run) writeLocks.delete(youtubeId)
  }
}

async function ensureDir(): Promise<void> {
  await mkdir(ANALYSES_DIR, { recursive: true })
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.tmp`
  await writeFile(tmpPath, contents, 'utf8')
  await rename(tmpPath, filePath)
}

function isStoredAnalysisCompatible(stored: StoredVideoAnalysis): boolean {
  if (!isAnalysisCacheCompatible({
    analysis_version: stored.analysisVersion,
    schema_version: stored.schemaVersion,
  })) {
    return false
  }
  if (stored.coveragePromptVersion !== AI_CONFIG.coveragePromptVersion) {
    return false
  }
  return Boolean(stored.analysis?.coverage || stored.analysis?.claims?.length)
}

export async function loadVideoAnalysisLocal(youtubeId: string): Promise<SourceAnalysis | null> {
  try {
    const raw = await readFile(analysisFilePath(youtubeId), 'utf8')
    const cleaned = raw.replace(/\0/g, '').trim()
    if (!cleaned) return null

    const stored = JSON.parse(cleaned) as StoredVideoAnalysis
    if (stored.youtubeId !== youtubeId) return null
    if (!isStoredAnalysisCompatible(stored)) return null

    return stored.analysis
  } catch {
    return null
  }
}

export async function saveVideoAnalysisLocal(
  youtubeId: string,
  analysis: SourceAnalysis,
): Promise<void> {
  await withWriteLock(youtubeId, async () => {
    await ensureDir()

    const stored: StoredVideoAnalysis = {
      youtubeId,
      analysisVersion: ANALYSIS_VERSION,
      schemaVersion: ANALYSIS_SCHEMA_VERSION,
      coveragePromptVersion: AI_CONFIG.coveragePromptVersion,
      cachedAt: new Date().toISOString(),
      analysis,
    }

    await atomicWrite(analysisFilePath(youtubeId), JSON.stringify(stored))
  })
}
