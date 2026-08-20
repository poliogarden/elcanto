# elcanto Railway Workers (optional)

Use when Vercel serverless timeouts block multi-video synthesis, or when you need MP4 export.

## Local MP4 export (recommended for development)

Terminal 1 — Next.js app:

```bash
pnpm dev
```

Terminal 2 — render worker:

```bash
pnpm dev:render-worker
```

`.env.local` (same values in both processes):

```env
WORKER_SECRET=dev-secret-change-me
LOCAL_RENDER_WORKER_URL=http://localhost:8788
RENDER_ALLOW_YTDLP=true
YTDLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Requirements:

- `ffmpeg` on PATH
- `yt-dlp` on PATH (auto-downloads YouTube sources when `RENDER_ALLOW_YTDLP=true`)

Flow:

```
Compose page → Export MP4
  → POST /api/compose/export
  → TTS interludes + render manifest
  → worker POST /render-composition
  → yt-dlp sources + FFmpeg trim/concat
  → MP4 at /api/files/render/[jobId]/[compositionId].mp4
```

Optional: upload the MP4 to your YouTube channel from the compose page (requires `youtube.upload` OAuth scope).

## Synthesis worker

1. Create a Railway service from this repo
2. Set start command: `node worker/server.mjs` (when added)
3. Configure env: `WORKER_SECRET`, `OPENAI_API_KEY`, `YOUTUBE_API_KEY`
4. In Vercel, set `RAILWAY_WORKER_URL` and `WORKER_SECRET`

## Composition render worker (Railway)

Encodes a composed thread to MP4 using FFmpeg + OpenAI TTS interludes.

1. Railway start command: `node worker/render-server.mjs`
2. Env: `WORKER_SECRET`, `PORT`, `RENDER_OUTPUT_DIR`, `FFMPEG_PATH`, `APP_URL`
3. Storage (pick one):
   - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RENDER_STORAGE_BUCKET=render-outputs`
   - S3: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_PUBLIC_URL`
4. In Vercel: `RAILWAY_RENDER_WORKER_URL`, `WORKER_SECRET`, same storage env vars

Without cloud storage, the worker serves MP4 at `GET /files/:jobId/:filename` and the Next app ingests it into `.data/render-jobs/`.

Run `supabase/render-jobs-schema.sql` and create a public `render-outputs` bucket for cloud job persistence.

The main app uses client-orchestrated processing by default.
Enable Railway only when needed.
