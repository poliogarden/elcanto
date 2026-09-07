import type { ChannelBrain, CreatorChannel, VideoProject } from '@/lib/creator/types'
import {
  loadBrain,
  loadChannel,
  loadProject,
  saveBrain,
  saveChannel,
  saveProject,
  listChannelsForUser,
  listProjectsForChannel,
} from '@/lib/creator/storage/local-store'

export async function getChannelForUser(
  channelId: string,
  userId: string,
): Promise<CreatorChannel | null> {
  const channel = await loadChannel(channelId)
  if (!channel) return null
  if (channel.userId === userId || channel.isSample) return channel
  return null
}

export async function getProjectForUser(
  projectId: string,
  userId: string,
): Promise<VideoProject | null> {
  const project = await loadProject(projectId)
  if (!project) return null
  if (project.userId === userId) return project
  const channel = await loadChannel(project.channelId)
  if (channel?.isSample) return project
  return null
}

export async function updateProject(
  projectId: string,
  userId: string,
  patch: Partial<VideoProject>,
): Promise<VideoProject | null> {
  const existing = await getProjectForUser(projectId, userId)
  if (!existing) return null
  const updated: VideoProject = {
    ...existing,
    ...patch,
    id: existing.id,
    userId: existing.userId,
    channelId: existing.channelId,
    updatedAt: new Date().toISOString(),
  }
  await saveProject(updated)
  return updated
}

export {
  saveChannel,
  saveBrain,
  saveProject,
  loadBrain,
  loadChannel,
  loadProject,
  listChannelsForUser,
  listProjectsForChannel,
}
