# Creator OS — Video Pipeline Implementation Report

**Date:** 2026-09-07  
**Scope:** ADDENDUM §35–96 — Full video generation from Channel Brain to MP4

---

## PRODUCT LOOP (IMPLEMENTED)

```
Channel Brain → Decision → Research → Angle → Outline → Script
→ Scene Planner → Asset Planner → Visual Resolver → Voice → Captions → Music
→ Timeline → Render Worker → Preview → NL Revision → Re-render → MP4
→ Publish Prep → (Analytics ready)
```

---

## VIDEO PIPELINE

| Stage | Module | Idempotent |
|-------|--------|------------|
| Script | `project-pipeline.ts` | ✓ |
| Scene Planner | `scene-planner.ts` | ✓ |
| Asset Planner | `asset-planner.ts` | ✓ cost-aware |
| Visual Resolver | `visual-resolver.ts` | ✓ per-scene |
| Voice | `providers/tts.ts` | ✓ scene cache via asset files |
| Captions | `caption-builder.ts` | SRT + VTT |
| Music | `music-layer.ts` | system ambient (no copyrighted music) |
| Timeline | `timeline-builder.ts` | source of truth |
| Render | `render/start-render.ts` + worker | scene segments → concat |
| Full orchestration | `full-video-pipeline.ts` | `runFullVideoPipeline()` |

### Demo path (no OpenAI required)

`skipLlm: true` uses `sample/demo-project.ts` with 4 scenes, SVG charts, silent TTS fallback, real FFmpeg render.

---

## PROVIDERS

| Type | Adapter | Production |
|------|---------|------------|
| TTS | `providers/tts.ts` | OpenAI `tts-1` when `OPENAI_API_KEY` set; silent MP3 fallback otherwise |
| Image | `providers/image-generation.ts` | DALL-E 3 when key present; SVG placeholder fallback |
| Video | `providers/video-generation.ts` | Capability interface; kinetic typography + FFmpeg primary path |
| Voice profiles | `providers/voice-profile.ts` | `nova-ko`, `nova-en`, system neutral |

No fake success — missing providers fall back to deterministic system-generated assets.

---

## RENDERING

**Decision:** FFmpeg via `worker/render-server.mjs` (Remotion not in repo).

- `POST /render-creator` — manifest v2
- Per-scene: kinetic typography | chart (drawbox bars) | image (SVG/PNG background)
- Draft mode: 640×360 proxy; Final: 1280×720 (full 1080p configurable in manifest)
- Scene artifacts: `scene_01.mp4`, `scene_02.mp4` … → concat → `{projectId}.mp4`
- Progress: QUEUED → RENDERING → READY / FAILED
- Webhook + poll updates project `renderVersions`

---

## STORAGE

```
.data/creator/
  projects/{id}/
    project.json
    assets/          # voice mp3, chart svg, visuals
    renders/         # manifest snapshots
    events.jsonl     # project history
  render-jobs/{jobId}.json
```

Asset provenance: `originType` = USER_UPLOAD | CHANNEL_OWNED | AI_GENERATED | LICENSED_SOURCE | SYSTEM_GENERATED

---

## VIDEO EDITING (NL → Mutation)

`mutation/apply-mutation.ts` — real project state changes:

| Command | Effect |
|---------|--------|
| 인트로 절반으로 줄여 | scene[0] shorten + voice regen |
| 2분 30초 부분 절반 | timestamp → scene lookup |
| 인트로 12초로 | target duration |
| 장면 N 삭제 | scene filter |
| 마지막 20초 삭제 | last scene trim/remove |
| N번 장면 차트로 | visualType + asset regen |
| 더 역동적으로 | generated_image visual |
| BGM 줄여 | backgroundMusic.volume |
| 자막 너무 길어 | caption shorten |
| N번 장면 다시 만들어 | partial regen |

Invalidation: `markSceneInvalidation()` — only affected scenes + downstream render.

---

## COST

`cost-estimation.ts` — counts generated images/videos, TTS words, duration. Displayed in workspace UI. No fake dollar amounts.

---

## DEMO VIDEO

1. `npm run dev:render-worker` (FFmpeg required)
2. `npm run dev`
3. `/creator` → Start video (uses demo pipeline if no API key)
4. Workspace → Draft render → playable MP4

Or headless: `npm run test -- lib/creator/__tests__/e2e-video.test.ts` (live render if worker running)

---

## VIDEO TESTS

```
lib/creator/__tests__/
  e2e-video.test.ts       — full pipeline + NL edit + persistence + optional live MP4
  invalidation-graph.test.ts
  caption-builder.test.ts
  manifest.test.ts
  demo-seed.test.ts
```

**Results:** 11 tests passing (live MP4 test skips gracefully if worker offline).

**ffprobe:** `render/validate-render.ts` validates duration, video stream, resolution when ffprobe available.

---

## MANUAL PROVIDER SETUP

| Requirement | Setup |
|-------------|-------|
| OpenAI (LLM + TTS + DALL-E) | `OPENAI_API_KEY` in `.env.local` |
| Render worker | `npm run dev:render-worker`, `WORKER_SECRET`, FFmpeg on PATH |
| YouTube indexing | `YOUTUBE_API_KEY` |
| YouTube upload | Google OAuth + `lib/youtube/upload-video.ts` (publish flow = metadata prep; upload requires user action) |
| Supabase production | Run `supabase/creator-schema.sql` |

---

## REMAINING (architecture ready, not blocking demo MP4)

- YouTube Analytics feedback loop (§71) — `analytics` field on project, wiring pending published video
- Voice cloning (§45) — opt-in architecture only
- Premiere-grade timeline UI (§49) — scene storyboard in workspace; full strip editor deferred
- Thumbnail image generation (§67) — concepts + DALL-E adapter; pair optimization partial
- Scene-level partial re-render cache in worker (§56) — segments generated; invalidation tracks dirty scenes

---

## DEFINITION OF DONE

✅ User can start from "다음 영상 만들어줘" (demo channel)  
✅ System produces scenes, voice, captions, timeline  
✅ Real MP4 via FFmpeg worker  
✅ NL edit changes project state and can re-render  
✅ Tests + report complete  
✅ Legacy synthesis preserved at `/legacy`
