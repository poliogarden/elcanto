# elcanto Railway Worker (optional)

Use when Vercel serverless timeouts block multi-video synthesis.

## Setup

1. Create a Railway service from this repo
2. Set start command: `node worker/server.mjs`
3. Configure env: `WORKER_SECRET`, `OPENAI_API_KEY`, `YOUTUBE_API_KEY`
4. In Vercel, set `RAILWAY_WORKER_URL` and `WORKER_SECRET`

## Flow

```
Vercel POST /api/worker/synthesis
  → Railway POST /process-synthesis
  → analyze videos + synthesize
  → return result
```

The main app uses client-orchestrated processing by default.
Enable Railway only when needed.
