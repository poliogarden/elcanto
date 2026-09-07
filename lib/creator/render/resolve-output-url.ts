import { getRenderWorkerUrl } from '@/lib/compose/render-worker-url'

/** Turn worker-relative `/files/...` paths into absolute URLs for browser playback. */
export function resolveCreatorOutputUrl(outputUrl: string | undefined | null): string | null {
  if (!outputUrl) return null
  if (outputUrl.startsWith('http://') || outputUrl.startsWith('https://')) return outputUrl
  const base = getRenderWorkerUrl() ?? process.env.LOCAL_RENDER_WORKER_URL ?? 'http://localhost:8788'
  return `${base.replace(/\/$/, '')}${outputUrl.startsWith('/') ? '' : '/'}${outputUrl}`
}
