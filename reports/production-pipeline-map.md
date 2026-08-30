# Production Pipeline Map

**Date:** 2026-08-30  
**Engine:** `reasoning-v2.2` (frozen — no benchmark tuning in this cycle)

## Consumer E2E (YouTube URL → Result UI)

```text
Home (app/page.tsx)
  → HomeWorkspace (components/home/home-workspace.tsx)
      parsePasteInput (lib/youtube/parse-paste-input.ts)
      POST /api/youtube/metadata (app/api/youtube/metadata/route.ts)
  → WorkspaceProvider tray (lib/workspace/workspace-provider.tsx)
      saveDraft → sessionStorage (lib/storage/synthesis-session.ts)
      router.push(/synthesize/[id])
  → AnalysisProgress (components/analysis-progress.tsx)
      POST /api/synthesis/jobs (app/api/synthesis/jobs/route.ts)
      GET /api/synthesis/jobs/[id] (poll)
      after() → runSynthesisJob (lib/synthesis/synthesis-job-runner.ts)
  → on complete: saveSynthesisDocument → /synthesis/[id]
  → SurvivalBoard (components/survival/survival-board.tsx)
      adapter-survival (lib/reasoning/adapter-survival.ts)
```

## Server pipeline (per job)

| Step | Code | API |
|------|------|-----|
| Job claim | `synthesis-job-repository.ts`, `synthesis-job-store.ts` | internal |
| Per-voice analyze | `analyzeOneSource` → `lib/pipeline/analyze-source.ts` | — |
| Transcript | `youtube-transcript-provider.ts`, `transcript.ts` | — |
| Hierarchical LLM | `hierarchical-analyze.ts`, `video-knowledge-merge.ts` | — |
| Reasoning (≥2 sources) | `runReasoningPipeline` → `lib/reasoning/pipeline.ts` | — |
| Single source | `runSingleSourceReasoning` → `lib/reasoning/single-source.ts` | — |
| Production meta | `productionMeta` on `SynthesisDocument` | stored in job `document.json` |

## Benchmark vs production — divergence

| | Benchmark / blind | Production |
|--|-------------------|------------|
| Input | Synthetic transcripts or hand-built `SourceAnalysis` | Live YouTube transcript + LLM |
| Builder | `benchmark-source-builder.ts`, `blind-data/*.ts` | `analyze-source.ts` |
| YouTube ingest | **Skipped** | `transcript-fetch`, oEmbed metadata |
| Convergence | `runReasoningPipeline()` in `pipeline.ts` | same |
| Pre-reasoning contract | `SourceAnalysis[]` + normalized claims/evidence | same type after `normalizeSourceAnalysis` |

**Risk:** Production-only normalization happens in `video-knowledge-merge.ts` and `source-ingest.ts`. Benchmark fixtures may omit fields production always sets (`segmentStartTime`, `evidenceSpans`). Reasoning entry is shared; extraction quality differs by path.

## Alternate / legacy paths (not main UI flow)

- `POST /api/synthesis/run` — expects pre-analyzed `sources[]`
- `POST /api/videos/analyze` — single-video analyze
- `POST /api/synthesis/stream` — streaming synthesis (legacy)
- Cron recovery: `GET /api/cron/synthesis-jobs`

## Partial failure

- `synthesis-job-runner.ts`: per-voice failures collected; continues if ≥1 analysis succeeds
- `analyze-source.ts`: returns `{ ok: false, failure }` without throwing
- Reasoning: off-topic sources → `excludedSources[]` (not job failure)
- UI: `analysis-progress.tsx` (failed thumbnails), `survival-board.tsx` (Analyzed / Failed / Excluded banner)

## Evidence lineage chain

```text
Transcript segment → Evidence (analysis.ts: id, timestamp, text, endTime)
  → StructuredClaim (relationship.ts: evidenceSegmentIds, segmentStartTime)
  → ReasoningClaim (reasoning/types.ts: evidenceSpans, timestampStart/End)
  → SurvivalClaim (adapter-survival.ts: timestamp, evidence)
  → EvidenceDrawer + youtubeWatchUrl (lib/youtube/timestamp.ts)
```

## Dev / acceptance tools

- `/dev/acceptance` — product acceptance dashboard (dev only)
- `GET/POST /api/dev/acceptance` — list jobs, save ratings
- `GET /api/debug/ai-cost` — recent AI usage (dev)
- Storage: `.data/product-acceptance/{synthesisId}.json`

## Version tracking (`productionMeta`)

Written on every completed job:

- `reasoningEngineVersion`
- `analysisVersion`, `analysisSchemaVersion`
- `analysisModel`, `synthesisModel`
- `pipelineRunAt`
- `diagnostics` (funnel + per-source)
- `costSummary`, `perfSummary`
