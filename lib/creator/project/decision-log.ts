import { randomUUID } from 'crypto'
import type { CreatorDecision, ArtifactVersion } from '@/lib/creator/intelligence/types'
import type { VideoProject } from '@/lib/creator/types'
import { appendProjectEvent, loadProject, saveProject } from '@/lib/creator/storage/local-store'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { CREATOR_DATA_DIR } from '@/lib/creator/config'

function versionsPath(projectId: string): string {
  return path.join(process.cwd(), CREATOR_DATA_DIR, 'projects', projectId, 'versions.json')
}

export async function recordDecision(
  projectId: string,
  decision: Omit<CreatorDecision, 'id' | 'timestamp'> & { id?: string },
): Promise<CreatorDecision> {
  const project = await loadProject(projectId)
  if (!project) throw new Error('Project not found')

  const entry: CreatorDecision = {
    id: decision.id ?? randomUUID(),
    timestamp: new Date().toISOString(),
    type: decision.type,
    what: decision.what,
    why: decision.why,
    context: decision.context,
    source: decision.source ?? 'user',
  }

  const updated: VideoProject = {
    ...project,
    decisions: [...(project.decisions as CreatorDecision[]), entry],
    updatedAt: new Date().toISOString(),
  }
  await saveProject(updated)
  await appendProjectEvent(projectId, { type: 'decision', decision: entry })
  return entry
}

export async function snapshotArtifact(
  projectId: string,
  artifact: string,
  snapshot: unknown,
  reason?: string,
): Promise<ArtifactVersion> {
  const file = versionsPath(projectId)
  await mkdir(path.dirname(file), { recursive: true })

  let versions: ArtifactVersion[] = []
  try {
    versions = JSON.parse(await readFile(file, 'utf8')) as ArtifactVersion[]
  } catch {
    versions = []
  }

  const version: ArtifactVersion = {
    id: randomUUID(),
    artifact,
    label: `${artifact} v${versions.filter((v) => v.artifact === artifact).length + 1}`,
    snapshot,
    createdAt: new Date().toISOString(),
    reason,
  }
  versions.push(version)
  await writeFile(file, JSON.stringify(versions, null, 2))
  return version
}

export async function loadArtifactVersions(projectId: string): Promise<ArtifactVersion[]> {
  try {
    return JSON.parse(await readFile(versionsPath(projectId), 'utf8')) as ArtifactVersion[]
  } catch {
    return []
  }
}

export async function restoreArtifactVersion(
  projectId: string,
  versionId: string,
): Promise<VideoProject | null> {
  const versions = await loadArtifactVersions(projectId)
  const version = versions.find((v) => v.id === versionId)
  if (!version) return null

  const project = await loadProject(projectId)
  if (!project) return null

  const patch: Partial<VideoProject> = { updatedAt: new Date().toISOString() }
  if (version.artifact === 'script') patch.script = version.snapshot
  if (version.artifact === 'outline') patch.outline = version.snapshot
  if (version.artifact === 'scenes') patch.scenes = version.snapshot as VideoProject['scenes']
  if (version.artifact === 'timeline') patch.timeline = version.snapshot as VideoProject['timeline']

  const updated = { ...project, ...patch }
  await saveProject(updated)
  await recordDecision(projectId, {
    type: 'ARTIFACT_RESTORED',
    what: `Restored ${version.artifact} to ${version.label}`,
    why: 'User undo',
    source: 'user',
  })
  return updated
}
