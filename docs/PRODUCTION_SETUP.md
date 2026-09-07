# Creator OS — Production Setup

External configuration required to run Creator OS in production.

---

## OpenAI (LLM, TTS, DALL-E)

| Item | Value |
|------|-------|
| Service | OpenAI API |
| Console | https://platform.openai.com/api-keys |
| Env var | `OPENAI_API_KEY` |
| Why | Research/angle/script generation, TTS narration, optional image generation |

Optional model overrides:

- `OPENAI_MODEL_SYNTHESIS`
- `OPENAI_MODEL_ANALYSIS`

Without API key: demo mode uses seeded script + silent TTS fallback + SVG visuals. **Real LLM quality requires key.**

---

## Render Worker (FFmpeg MP4)

| Item | Value |
|------|-------|
| Service | Local or Railway worker |
| Command | `npm run dev:render-worker` |
| Env vars | `LOCAL_RENDER_WORKER_URL=http://localhost:8788`, `WORKER_SECRET` |
| Why | Actual MP4 generation (H.264/AAC) |

Requirements: FFmpeg on PATH (`FFMPEG_PATH` optional).

Production: deploy `worker/render-server.mjs` to Railway with `RAILWAY_RENDER_WORKER_URL` set in Next.js.

---

## YouTube Data API (Channel Indexing)

| Item | Value |
|------|-------|
| Service | Google Cloud Console → YouTube Data API v3 |
| Env var | `YOUTUBE_API_KEY` |
| Why | Import recent channel videos for Channel Brain indexing |

Demo mode works without this (seeded sample channel).

---

## Google OAuth (YouTube Connect + Upload)

| Item | Value |
|------|-------|
| Service | Google Cloud Console → OAuth 2.0 |
| Env vars | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| Scopes | `youtube.readonly` (indexing), `youtube.upload` (publish — if enabled) |
| Why | Connect real channel, optional upload |

Publish upload requires explicit user action in Review screen.

---

## Supabase (Optional Production DB)

| Item | Value |
|------|-------|
| Service | Supabase project |
| SQL | Run `supabase/creator-schema.sql` in SQL Editor |
| Env vars | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Why | Production persistence with RLS |

**Default dev:** `.data/creator/` local files (no Supabase required).

---

## App URL

| Env var | Example | Why |
|---------|---------|-----|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Render worker fetches voice/assets from Next.js |
| `APP_URL` | same | Worker env for asset resolution |

---

## Feature Flags

| Env var | Default | Effect |
|---------|---------|--------|
| `ELCANTO_CREATOR_MODE` | on (`!== '0'`) | Root redirects to `/creator` |
| `ELCANTO_LEGACY_MODE` | off | Force `/legacy` at root |

---

## Quick Start (Demo, no external keys)

```bash
npm run dev:render-worker   # terminal 1
npm run dev                 # terminal 2
# Open http://localhost:3000/creator
```

Sample channel **Tech Macro Daily** seeds automatically with positions, open loops, audience questions, and opportunities.
