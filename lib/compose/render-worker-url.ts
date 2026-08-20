/** Resolves the FFmpeg render worker base URL (Railway or local dev). */
export function getRenderWorkerUrl(): string | undefined {
  return (
    process.env.RAILWAY_RENDER_WORKER_URL ??
    process.env.LOCAL_RENDER_WORKER_URL ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:8788' : undefined)
  )?.replace(/\/$/, '')
}

export function getRenderWorkerSecret(): string | undefined {
  return process.env.WORKER_SECRET
}

export function isRenderWorkerConfigured(): boolean {
  return Boolean(getRenderWorkerUrl() && getRenderWorkerSecret())
}
