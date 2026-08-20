import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getRenderOutputPath } from '@/lib/compose/render-asset-store'

export async function ingestWorkerRenderOutput(params: {
  workerUrl: string
  workerSecret: string
  jobId: string
  compositionId: string
  outputUrl?: string
  appUrl: string
}): Promise<string | undefined> {
  const { workerUrl, workerSecret, jobId, compositionId, outputUrl, appUrl } = params
  if (!outputUrl) return undefined

  const filename = `${compositionId}.mp4`
  const localApiUrl = `/api/files/render/${jobId}/${filename}`

  let fetchUrl = outputUrl
  if (outputUrl.startsWith('/files/')) {
    fetchUrl = `${workerUrl}${outputUrl}`
  } else if (outputUrl.startsWith('/api/files/')) {
    fetchUrl = `${appUrl}${outputUrl}`
  }

  if (!fetchUrl.startsWith('http')) {
    return outputUrl.startsWith('/') ? `${appUrl}${outputUrl}` : outputUrl
  }

  try {
    const headers: Record<string, string> = {}
    if (fetchUrl.startsWith(workerUrl)) {
      headers['x-worker-secret'] = workerSecret
    }

    const res = await fetch(fetchUrl, { headers })
    if (!res.ok) {
      return outputUrl.startsWith('http') ? outputUrl : `${appUrl}${outputUrl}`
    }

    const buf = Buffer.from(await res.arrayBuffer())
    const dest = getRenderOutputPath(jobId, filename)
    await mkdir(path.dirname(dest), { recursive: true })
    await writeFile(dest, buf)
    return localApiUrl
  } catch {
    return outputUrl.startsWith('http') ? outputUrl : `${appUrl}${outputUrl}`
  }
}
