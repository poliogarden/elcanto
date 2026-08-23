import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
import {
  loadVideoAnalysisLocal,
  saveVideoAnalysisLocal,
  type StoredVideoAnalysis,
} from '@/lib/repositories/video-analysis-store'
import type { SourceAnalysis } from '@/lib/types/source'

const TEST_DIR = path.join(process.cwd(), '.data', 'video-analyses')

function sampleAnalysis(videoId: string): SourceAnalysis {
  return {
    sourceId: 'src_1',
    videoId,
    voiceIndex: 0,
    title: 'Test video',
    summary: 'Summary',
    thesis: 'Thesis',
    mainClaims: ['claim'],
    claims: [{
      id: 'src_1_claim_1',
      sourceId: 'src_1',
      statement: 'claim',
      topic: 'general',
      confidence: 0.8,
    }],
    topics: ['topic'],
    keyTopics: ['topic'],
    entities: [],
    conclusions: [],
    implications: [],
    evidence: [],
    stance: null,
    coverage: {
      transcriptDurationSeconds: 60,
      analyzedDurationSeconds: 60,
      coverageRatio: 1,
      sectionCount: 1,
      coverageSectionCount: 1,
      deepAnalyzedSectionCount: 1,
      transcriptCharCount: 100,
      analyzedCharCount: 100,
    },
  }
}

describe('video-analysis-store', () => {
  const videoId = 'test_video_cache_123'

  afterEach(async () => {
    try {
      await rm(path.join(TEST_DIR, `${videoId}.json`), { force: true })
    } catch {
      // ignore
    }
  })

  it('saves and loads analysis from local disk', async () => {
    const analysis = sampleAnalysis(videoId)
    await saveVideoAnalysisLocal(videoId, analysis)

    const loaded = await loadVideoAnalysisLocal(videoId)
    expect(loaded?.videoId).toBe(videoId)
    expect(loaded?.claims?.[0]?.statement).toBe('claim')
  })

  it('rejects incompatible coverage prompt version', async () => {
    await mkdir(TEST_DIR, { recursive: true })
    const stored: StoredVideoAnalysis = {
      youtubeId: videoId,
      analysisVersion: '6',
      schemaVersion: '3',
      coveragePromptVersion: '0',
      cachedAt: new Date().toISOString(),
      analysis: sampleAnalysis(videoId),
    }
    await writeFile(path.join(TEST_DIR, `${videoId}.json`), JSON.stringify(stored), 'utf8')

    const loaded = await loadVideoAnalysisLocal(videoId)
    expect(loaded).toBeNull()
  })

  it('persists json that can be read back from disk', async () => {
    await saveVideoAnalysisLocal(videoId, sampleAnalysis(videoId))
    const raw = await readFile(path.join(TEST_DIR, `${videoId}.json`), 'utf8')
    const parsed = JSON.parse(raw) as StoredVideoAnalysis
    expect(parsed.youtubeId).toBe(videoId)
    expect(parsed.analysis.title).toBe('Test video')
  })
})
