import { randomUUID } from 'crypto'
import { analyzeOneSource } from '@/lib/pipeline/analyze-source'
import {
  buildChannelBrainFromAnalyses,
  buildContentOpportunities,
} from '@/lib/creator/brain/build-channel-brain'
import { CREATOR_INDEX_BATCH_SIZE } from '@/lib/creator/config'
import type { CreatorChannel } from '@/lib/creator/types'
import {
  loadChannel,
  saveBrain,
  saveChannel,
  saveOpportunityCache,
} from '@/lib/creator/storage/local-store'
import { fetchChannelRecentVideos } from '@/lib/youtube/channel-videos'
import type { SourceAnalysis } from '@/lib/types/source'

export type ChannelIndexJob = {
  id: string
  channelId: string
  status: 'queued' | 'running' | 'ready' | 'failed'
  videoIds: string[]
  analyzed: number
  total: number
  error?: string
  startedAt?: string
  completedAt?: string
}

const inflight = new Map<string, Promise<void>>()

export async function startChannelIndex(channelId: string): Promise<ChannelIndexJob> {
  const channel = await loadChannel(channelId)
  if (!channel) throw new Error('Channel not found')

  const jobId = randomUUID()
  const job: ChannelIndexJob = {
    id: jobId,
    channelId,
    status: 'queued',
    videoIds: [],
    analyzed: 0,
    total: 0,
  }

  const run = runChannelIndexJob(channel, job)
  inflight.set(jobId, run)
  void run.finally(() => inflight.delete(jobId))

  return job
}

async function runChannelIndexJob(
  channel: CreatorChannel,
  job: ChannelIndexJob,
): Promise<void> {
  job.status = 'running'
  job.startedAt = new Date().toISOString()

  await updateChannelProgress(channel, {
    phase: 'importing',
    imported: 0,
    analyzed: 0,
    total: 0,
    message: 'Fetching recent uploads',
  })

  try {
    const videos = await fetchChannelRecentVideos(channel.youtubeChannelId, 12)
    job.videoIds = videos.map((v) => v.videoId)
    job.total = videos.length

    await updateChannelProgress(channel, {
      phase: 'analyzing',
      imported: videos.length,
      analyzed: 0,
      total: videos.length,
      message: 'Analyzing transcripts',
    })

    const analyses: SourceAnalysis[] = []
    for (let i = 0; i < videos.length; i += CREATOR_INDEX_BATCH_SIZE) {
      const batch = videos.slice(i, i + CREATOR_INDEX_BATCH_SIZE)
      const results = await Promise.all(
        batch.map((video, batchIdx) =>
          analyzeOneSource({
            sourceId: `ch_${channel.id}_${video.videoId}`,
            videoId: video.videoId,
            voiceIndex: i + batchIdx,
            title: video.title,
            channel: video.channelTitle ?? channel.title,
            url: video.url ?? `https://www.youtube.com/watch?v=${video.videoId}`,
          }),
        ),
      )

      for (const result of results) {
        if (result.ok) analyses.push(result.analysis)
        job.analyzed += 1
        await updateChannelProgress(channel, {
          phase: 'analyzing',
          imported: videos.length,
          analyzed: job.analyzed,
          total: videos.length,
          message: `Analyzed ${job.analyzed}/${videos.length}`,
        })
      }
    }

    const brain = buildChannelBrainFromAnalyses({
      channelId: channel.id,
      analyses,
    })
    const opportunities = buildContentOpportunities(brain)
    brain.opportunities = opportunities

    await saveBrain(brain)
    await saveOpportunityCache(channel.id, opportunities)

    await updateChannelProgress(channel, {
      phase: 'ready',
      imported: videos.length,
      analyzed: analyses.length,
      total: videos.length,
      message: 'Channel Brain ready',
    })

    job.status = 'ready'
    job.completedAt = new Date().toISOString()
  } catch (err) {
    job.status = 'failed'
    job.error = err instanceof Error ? err.message : 'Indexing failed'
    job.completedAt = new Date().toISOString()
    await updateChannelProgress(channel, {
      phase: 'failed',
      imported: channel.indexingProgress.imported,
      analyzed: channel.indexingProgress.analyzed,
      total: channel.indexingProgress.total,
      message: job.error,
    })
  }
}

async function updateChannelProgress(
  channel: CreatorChannel,
  progress: CreatorChannel['indexingProgress'],
): Promise<void> {
  const updated: CreatorChannel = {
    ...channel,
    indexingStatus:
      progress.phase === 'ready'
        ? 'ready'
        : progress.phase === 'failed'
          ? 'failed'
          : 'indexing',
    indexingProgress: progress,
    updatedAt: new Date().toISOString(),
  }
  await saveChannel(updated)
}
