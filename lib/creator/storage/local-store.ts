import { mkdir, readFile, readdir, rename, writeFile } from 'fs/promises'
import path from 'path'
import type {
  ChannelBrain,
  ContentOpportunity,
  CreatorChannel,
  VideoProject,
} from '@/lib/creator/types'
import { CREATOR_DATA_DIR } from '@/lib/creator/config'

const ROOT = path.join(process.cwd(), CREATOR_DATA_DIR)

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.tmp`
  await writeFile(tmp, contents, 'utf8')
  await rename(tmp, filePath)
}

function channelPath(id: string): string {
  return path.join(ROOT, 'channels', id, 'channel.json')
}

function brainPath(channelId: string): string {
  return path.join(ROOT, 'channels', channelId, 'brain.json')
}

function projectPath(id: string): string {
  return path.join(ROOT, 'projects', id, 'project.json')
}

function eventsPath(projectId: string): string {
  return path.join(ROOT, 'projects', projectId, 'events.jsonl')
}

export async function saveChannel(channel: CreatorChannel): Promise<void> {
  const file = channelPath(channel.id)
  await ensureDir(path.dirname(file))
  await atomicWrite(file, JSON.stringify(channel, null, 2))
}

export async function loadChannel(id: string): Promise<CreatorChannel | null> {
  try {
    const raw = await readFile(channelPath(id), 'utf8')
    return JSON.parse(raw) as CreatorChannel
  } catch {
    return null
  }
}

export async function listChannelsForUser(userId: string): Promise<CreatorChannel[]> {
  const dir = path.join(ROOT, 'channels')
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const channels: CreatorChannel[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const ch = await loadChannel(entry.name)
      if (ch && ch.userId === userId) channels.push(ch)
    }
    return channels
  } catch {
    return []
  }
}

export async function saveBrain(brain: ChannelBrain): Promise<void> {
  const file = brainPath(brain.channelId)
  await ensureDir(path.dirname(file))
  await atomicWrite(file, JSON.stringify(brain, null, 2))
}

export async function loadBrain(channelId: string): Promise<ChannelBrain | null> {
  try {
    const raw = await readFile(brainPath(channelId), 'utf8')
    return JSON.parse(raw) as ChannelBrain
  } catch {
    return null
  }
}

export async function saveProject(project: VideoProject): Promise<void> {
  const file = projectPath(project.id)
  await ensureDir(path.dirname(file))
  await atomicWrite(file, JSON.stringify(project, null, 2))
}

export async function loadProject(id: string): Promise<VideoProject | null> {
  try {
    const raw = await readFile(projectPath(id), 'utf8')
    return JSON.parse(raw) as VideoProject
  } catch {
    return null
  }
}

export async function listProjectsForChannel(channelId: string): Promise<VideoProject[]> {
  const dir = path.join(ROOT, 'projects')
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const projects: VideoProject[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const p = await loadProject(entry.name)
      if (p && p.channelId === channelId) projects.push(p)
    }
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return []
  }
}

export async function appendProjectEvent(
  projectId: string,
  event: Record<string, unknown>,
): Promise<void> {
  const file = eventsPath(projectId)
  await ensureDir(path.dirname(file))
  await writeFile(file, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`, {
    flag: 'a',
  })
}

export async function saveOpportunityCache(
  channelId: string,
  opportunities: ContentOpportunity[],
): Promise<void> {
  const file = path.join(ROOT, 'channels', channelId, 'opportunities.json')
  await ensureDir(path.dirname(file))
  await atomicWrite(file, JSON.stringify(opportunities, null, 2))
}

export async function loadOpportunityCache(
  channelId: string,
): Promise<ContentOpportunity[] | null> {
  try {
    const raw = await readFile(
      path.join(ROOT, 'channels', channelId, 'opportunities.json'),
      'utf8',
    )
    return JSON.parse(raw) as ContentOpportunity[]
  } catch {
    return null
  }
}

export function creatorAssetDir(projectId: string): string {
  return path.join(ROOT, 'projects', projectId, 'assets')
}

function memoryPath(channelId: string): string {
  return path.join(ROOT, 'channels', channelId, 'memory.json')
}

export async function saveChannelMemory(
  memory: import('@/lib/creator/intelligence/types').ChannelMemory,
): Promise<void> {
  const file = memoryPath(memory.channelId)
  await ensureDir(path.dirname(file))
  await atomicWrite(file, JSON.stringify(memory, null, 2))
}

export async function loadChannelMemory(
  channelId: string,
): Promise<import('@/lib/creator/intelligence/types').ChannelMemory | null> {
  try {
    const raw = await readFile(memoryPath(channelId), 'utf8')
    return JSON.parse(raw) as import('@/lib/creator/intelligence/types').ChannelMemory
  } catch {
    return null
  }
}

export function creatorRenderDir(projectId: string): string {
  return path.join(ROOT, 'projects', projectId, 'renders')
}

function renderJobPath(jobId: string): string {
  return path.join(ROOT, 'render-jobs', `${jobId}.json`)
}

export type StoredRenderJob = {
  id: string
  projectId: string
  status: string
  progress: number
  progressLabel?: string
  outputUrl?: string
  error?: string
  versionLabel?: string
  createdAt: string
  completedAt?: string
}

export async function saveRenderJob(job: StoredRenderJob): Promise<void> {
  const file = renderJobPath(job.id)
  await ensureDir(path.dirname(file))
  await atomicWrite(file, JSON.stringify(job, null, 2))
}

export async function loadRenderJob(jobId: string): Promise<StoredRenderJob | null> {
  try {
    const raw = await readFile(renderJobPath(jobId), 'utf8')
    return JSON.parse(raw) as StoredRenderJob
  } catch {
    return null
  }
}

export async function listRenderJobsForProject(projectId: string): Promise<StoredRenderJob[]> {
  const dir = path.join(ROOT, 'render-jobs')
  try {
    const files = await readdir(dir)
    const jobs: StoredRenderJob[] = []
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const job = await loadRenderJob(file.replace('.json', ''))
      if (job && job.projectId === projectId) jobs.push(job)
    }
    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}
