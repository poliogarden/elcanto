import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import type { AssetOriginType, VisualAsset } from '@/lib/creator/types'
import { creatorAssetDir } from '@/lib/creator/storage/local-store'

export async function registerProjectAsset(input: {
  projectId: string
  sceneId?: string
  fileName: string
  contents: Buffer | string
  mimeType: string
  originType: AssetOriginType
  provider?: string
  costTier?: VisualAsset['costTier']
  prompt?: string
}): Promise<VisualAsset> {
  const dir = creatorAssetDir(input.projectId)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, input.fileName)
  const buf = typeof input.contents === 'string' ? Buffer.from(input.contents, 'utf8') : input.contents
  await writeFile(filePath, buf)

  const id = input.fileName.replace(/\.[^.]+$/, '')
  return {
    id,
    projectId: input.projectId,
    sceneId: input.sceneId,
    originType: input.originType,
    mimeType: input.mimeType,
    fileName: input.fileName,
    publicUrl: `/api/creator/assets/${input.projectId}/${input.fileName}`,
    provider: input.provider,
    costTier: input.costTier ?? 'free',
    prompt: input.prompt,
    createdAt: new Date().toISOString(),
  }
}

export function mergeVisualAssets(
  existing: VisualAsset[],
  incoming: VisualAsset[],
): VisualAsset[] {
  const map = new Map(existing.map((a) => [a.id, a]))
  for (const asset of incoming) map.set(asset.id, asset)
  return [...map.values()]
}

export function findAssetForScene(
  assets: VisualAsset[],
  sceneId: string,
): VisualAsset | undefined {
  return assets.find((a) => a.sceneId === sceneId)
}
