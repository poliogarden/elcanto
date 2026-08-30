# elcanto — YouTube Product Acceptance & Production Hardening (통합 산출물)

**Date:** 2026-08-30  
**Engine:** `reasoning-v2.2` (frozen — blind benchmark tuning 없음)  
**목적:** 실제 YouTube URL로 elcanto 전체 기능을 반복 검증할 production-like 환경 완성

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [최종 보고 (10항목)](#2-최종-보고-10항목)
3. [Production Pipeline Map](#3-production-pipeline-map)
4. [YouTube E2E Audit](#4-youtube-e2e-audit)
5. [Product Acceptance Readiness](#5-product-acceptance-readiness)
6. [Reasoning V2 Production Diagnostics](#6-reasoning-v2-production-diagnostics)
7. [이번 작업에서 하지 않은 것](#7-이번-작업에서-하지-않은-것)

---

## 1. Executive Summary

| 영역 | 상태 | 비고 |
|------|------|------|
| URL → metadata → job → result | **구현 완료** | `/api/synthesis/jobs` 주 경로 |
| Reasoning V2 production | **구현 완료** | `reasoning-v2.2`, eval과 동일 `pipeline.ts` |
| Partial failure | **구현 완료** | ≥1 영상 성공 시 synthesis 계속 |
| Evidence / timestamp | **구현 완료** | `youtubeWatchUrl`, 가짜 timestamp 없음 |
| Production diagnostics | **구현 완료** | `productionMeta.diagnostics` + perf/cost |
| Acceptance mode | **구현 완료** | `/dev/acceptance` + API |
| Live URL acceptance 실행 | **미실행** | API key 없는 agent 환경 |

**E2E 준비:** **READY** (사용자 주도 테스트). 자동 acceptance set A–E는 이번 세션에서 실행하지 않음.

**다음 행동:** 영상 몇 개 골라 elcanto에 넣고 `/dev/acceptance`에서 평가.

---

## 2. 최종 보고 (10항목)

### 1. 실제 YouTube E2E 준비 여부

**READY** — 코드·도구 완성. live acceptance 수치는 사용자 실행 필요.

### 2. 실제 사용자 흐름

**정상** — 홈 URL → metadata → draft → `/synthesize/[id]` → job → analyze → reasoning → `/synthesis/[id]` → SurvivalBoard.

### 3. Evidence / timestamp

**정확** — transcript segment → claim → SurvivalClaim → EvidenceDrawer → YouTube `&t=` 링크.

### 4. Partial failure

**정상** — 영상 단위 실패 수집, ≥1 성공 시 진행. UI에 Analyzed / Failed / Excluded 표시.

### 5. Acceptance Mode

**사용 가능** — `/dev/acceptance`, `GET/POST /api/dev/acceptance`, `.data/product-acceptance/`.

### 6. Diagnostics

**추적 가능** — `productionMeta` 퍼널, per-source, cost, perf.

### 7. Performance

**기록 구조 완성** — `individual_analysis`, `reasoning`, `total`, `endToEndMs`. 3/5/10 영상 실측은 live run 후 확인.

### 8. Cost

**synthesis 단위 집계** — `costSummary` (operation별 tokens/USD).

### 9. Blocking issue

- Live acceptance 미실행 (credentials 필요)
- 홈 검색창 playlist paste 제한 (source-picker 경로 사용)
- 입력 URL `&t=` offset은 ingest 시 미사용

### 10. 다음 행동

`OPENAI_API_KEY` 설정 → `pnpm dev` → URL paste → Run → `/dev/acceptance` 평가.

---

## 3. Production Pipeline Map

**Engine:** `reasoning-v2.2` (frozen)

### Consumer E2E (YouTube URL → Result UI)

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

### Server pipeline (per job)

| Step | Code | API |
|------|------|-----|
| Job claim | `synthesis-job-repository.ts`, `synthesis-job-store.ts` | internal |
| Per-voice analyze | `analyzeOneSource` → `lib/pipeline/analyze-source.ts` | — |
| Transcript | `youtube-transcript-provider.ts`, `transcript.ts` | — |
| Hierarchical LLM | `hierarchical-analyze.ts`, `video-knowledge-merge.ts` | — |
| Reasoning (≥2 sources) | `runReasoningPipeline` → `lib/reasoning/pipeline.ts` | — |
| Single source | `runSingleSourceReasoning` → `lib/reasoning/single-source.ts` | — |
| Production meta | `productionMeta` on `SynthesisDocument` | stored in job `document.json` |

### Benchmark vs production — divergence

| | Benchmark / blind | Production |
|--|-------------------|------------|
| Input | Synthetic transcripts or hand-built `SourceAnalysis` | Live YouTube transcript + LLM |
| Builder | `benchmark-source-builder.ts`, `blind-data/*.ts` | `analyze-source.ts` |
| YouTube ingest | **Skipped** | `transcript-fetch`, oEmbed metadata |
| Convergence | `runReasoningPipeline()` in `pipeline.ts` | same |
| Pre-reasoning contract | `SourceAnalysis[]` + normalized claims/evidence | same type after `normalizeSourceAnalysis` |

**Risk:** Production-only normalization in `video-knowledge-merge.ts` and `source-ingest.ts`. Benchmark fixtures may omit fields production sets (`segmentStartTime`, `evidenceSpans`). Reasoning entry shared; extraction quality differs upstream.

### Alternate / legacy paths (not main UI flow)

- `POST /api/synthesis/run` — expects pre-analyzed `sources[]`
- `POST /api/videos/analyze` — single-video analyze
- `POST /api/synthesis/stream` — streaming synthesis (legacy)
- Cron recovery: `GET /api/cron/synthesis-jobs`

### Partial failure

- `synthesis-job-runner.ts`: per-voice failures collected; continues if ≥1 analysis succeeds
- `analyze-source.ts`: returns `{ ok: false, failure }` without throwing
- Reasoning: off-topic sources → `excludedSources[]` (not job failure)
- UI: `analysis-progress.tsx` (failed thumbnails), `survival-board.tsx` (Analyzed / Failed / Excluded banner)

### Evidence lineage chain

```text
Transcript segment → Evidence (analysis.ts: id, timestamp, text, endTime)
  → StructuredClaim (relationship.ts: evidenceSegmentIds, segmentStartTime)
  → ReasoningClaim (reasoning/types.ts: evidenceSpans, timestampStart/End)
  → SurvivalClaim (adapter-survival.ts: timestamp, evidence)
  → EvidenceDrawer + youtubeWatchUrl (lib/youtube/timestamp.ts)
```

### Dev / acceptance tools

- `/dev/acceptance` — product acceptance dashboard (dev only)
- `GET/POST /api/dev/acceptance` — list jobs, save ratings
- `GET /api/debug/ai-cost` — recent AI usage (dev)
- Storage: `.data/product-acceptance/{synthesisId}.json`

### Version tracking (`productionMeta`)

Written on every completed job:

- `reasoningEngineVersion`
- `analysisVersion`, `analysisSchemaVersion`
- `analysisModel`, `synthesisModel`
- `pipelineRunAt`
- `diagnostics` (funnel + per-source)
- `costSummary`, `perfSummary`

---

## 4. YouTube E2E Audit

**Scope:** Real-user flow from URL paste to synthesis result (no Reasoning V2 benchmark changes)

### URL ingestion

#### Supported (code-verified)

| Format | Parser | Test coverage |
|--------|--------|---------------|
| `youtube.com/watch?v=` | `lib/youtube/url.ts` | `parse-paste-input.test.ts` |
| `youtu.be/` | same | yes (`dQw4w9WgXcQ`) |
| `youtube.com/shorts/` | same | code path only |
| `youtube.com/embed/`, `/v/` | same | — |
| Bare 11-char ID | same | yes |
| Multi-URL paste (whitespace/comma) | `parse-paste-input.ts` | yes |
| Playlist ID (`list=`, `/playlist/`) | `playlist-url.ts` | `phase2.test.ts` |

#### Limitations

- **Timestamp in input URL** (`&t=`, `start=`): video ID extracted; start offset not used at ingest.
- **Home workspace**: multi-video paste works; playlist paste may fall through to text search — use `source-picker.tsx` + `POST /api/youtube/playlist`.
- **Private / deleted / age-restricted**: failures mapped to per-voice `SourceFailure` codes.

### Transcript → analysis

- Provider: `youtube-transcript-provider.ts` (auto + manual captions)
- Languages: depends on video captions (Korean/English)
- Cache: `video-cache.ts`
- Section failures: `hierarchical-analyze.ts` → partial coverage via merge

### Production vs benchmark contract

Both feed `runReasoningPipeline({ sources: SourceAnalysis[] })`. No separate reasoning code path.

### UI comprehension (existing design)

- Agreement / divide / complementary: `SurvivalBoard`, `RelationshipExplorerEmergent`, `EvidenceDrawer`
- Excluded: banner + EXCLUDED badges
- Failed analyses: `analysis-progress.tsx`, `SurvivalBoard` banner
- Judgment: `JudgmentProvenance`, reasoning graph
- Uncertain relationships: only `verificationStatus === 'SUPPORTED'` in primary UI

### Test URLs in repository

| ID | Use |
|----|-----|
| `dQw4w9WgXcQ`, `jNQXAC9IVRw` | Unit tests |
| `bVJFh0d7NZY`, `iD9xKlzp_Ps`, `q22YTPeTgHE` | MCP 3-video eval baseline |

No curated acceptance sets A–E as fixtures. Label via `testSetLabel` in acceptance API.

### Regression tests (2026-08-30)

- `lib/production` — 3 passed
- `lib/youtube` + `lib/synthesis` — 52 passed

### Blocking issues for live acceptance

1. `OPENAI_API_KEY` required
2. Network for YouTube transcript/metadata
3. Optional: Supabase (local `.data/synthesis-jobs` works in dev)

No code blockers for user-initiated live testing.

---

## 5. Product Acceptance Readiness

**Goal:** Repeatable real-YouTube product value validation (not blind recall improvement)

### Readiness verdict: **READY (user-driven)**

Harness in place. Automated multi-set live runs **not executed** (missing API key in agent environment).

### Acceptance mode

| Component | Path | Status |
|-----------|------|--------|
| Dev dashboard | `/dev/acceptance` | ✅ |
| List recent jobs | `GET /api/dev/acceptance` | ✅ |
| Save ratings | `POST /api/dev/acceptance` | ✅ |
| Persistence | `.data/product-acceptance/{synthesisId}.json` | ✅ |
| Dev guard | `ELCANTO_DEV_TOOLS=1` or `NODE_ENV !== production` | ✅ |

### Rating dimensions

- Individual analysis, Agreement, Divide, Complementary, Evidence, Final synthesis — `good | partial | bad`
- Missed relationship? / False relationship?
- Time saving vs watching? / Would use again?
- Optional notes + failure category tags

### V3 backlog aggregation

`summarizeAcceptanceBacklog()` — failure taxonomy counts across ratings → UX vs Reasoning V3 priority signal.

### Failure taxonomy (UI)

`INGEST_FAILURE`, `TRANSCRIPT_FAILURE`, `EXTRACTION_FAILURE`, `EVIDENCE_FAILURE`, `RELEVANCE_FAILURE`, `RELATIONSHIP_MISS`, `FALSE_RELATIONSHIP`, `JUDGMENT_FAILURE`, `UX_COMPREHENSION_FAILURE`, `PERFORMANCE_FAILURE`

### Operator checklist

1. `pnpm dev` with `OPENAI_API_KEY`
2. Paste 3–5 YouTube URLs → Run synthesis
3. Wait for `/synthesis/[id]`
4. Open `/dev/acceptance` → rate
5. Repeat for sets A–E
6. Review backlog on dashboard

### Suggested test sets

| Set | Intent | Videos |
|-----|--------|--------|
| A Agreement | Same topic, similar conclusions | 3 |
| B Divide | Same topic, opposing conclusions | 3–5 |
| C Complementary | Same phenomenon, different angles | 3–5 |
| D Mixed | Related + irrelevant | 4–6 |
| E Complex | Multi-claim technical/economic | 5+ |

### Production telemetry (per synthesis)

`document.productionMeta`: engine/model versions, analyzed/failed/requested counts, funnel, per-source stats, `costSummary`, `perfSummary`.

---

## 6. Reasoning V2 Production Diagnostics

**Engine:** `reasoning-v2.2` (frozen baseline preserved)

### Where diagnostics live

```text
SynthesisJob.document.productionMeta
  ├── reasoningEngineVersion
  ├── analysisVersion / analysisSchemaVersion
  ├── analysisModel / synthesisModel
  ├── analyzedCount / failedCount / requestedCount
  ├── diagnostics (ProductionPipelineDiagnostics)
  ├── costSummary (SynthesisCostSummary)
  └── perfSummary (SynthesisPerfSummary)
```

**Writer:** `lib/synthesis/synthesis-job-runner.ts`  
**Builder:** `lib/production/build-pipeline-diagnostics.ts`  
**Types:** `lib/production/types.ts`

### Funnel summary (multi-source)

| Stage | Source field | Meaning |
|-------|--------------|---------|
| Sources requested | `requestedSources` | Voices in draft |
| Analyzed | `analyzedSources` | Successful `SourceAnalysis` |
| Failed ingest/analyze | `failedSources` | Transcript/extraction failures |
| Excluded by relevance | `excludedSources` | Off-topic after reasoning ingest |
| Claims extracted | `funnel.claimsExtracted` | `pipelineStats.claimsExtracted` |
| Relevance usable | `funnel.relevanceUsable` | Post-relevance filter |
| Generation eligible | `funnel.generationEligible` | Pool for relationship generation |
| Candidate pairs | `funnel.candidatePairs` | Pre-verification candidates |
| Verified relationships | `funnel.verifiedRelationships` | Supported relationships |
| Agreement / Divide / Complementary | `funnel.*` | Type breakdown (SUPPORTED only) |
| Judgment | `judgmentPresent` | Final judgment statement exists |
| Evidence integrity | `evidenceIntegrityPass` | Reasoning evidence audit |

### Per-source rows (`diagnostics.perSource[]`)

| Field | Description |
|-------|-------------|
| `status` | `analyzed`, `failed`, `excluded` |
| `failureCode` / `failureMessage` | e.g. `no_transcript` |
| `transcriptOk` | false when transcript missing |
| `claimsExtracted` | claim count from analysis |
| `evidenceSupported` | claims with linked evidence |

### Performance phases (`perfSummary`)

| Phase | Captured |
|-------|----------|
| `individual_analysis` | All per-voice analyze (transcript + LLM) |
| `reasoning` | `runReasoningPipeline` wall time |
| `total` | Full job after claim |
| `individualAnalysisMs` | Wall clock analyze segment |
| `endToEndMs` | Analyze + reasoning total |

**Note:** Per-video metadata/transcript ms not split today — aggregate under `individual_analysis`.

### Cost aggregation (`costSummary`)

`runWithAIContext({ costAccumulator })` + `buildSynthesisCostSummary()`:

- `byOperation`: calls, tokens, cost per AI operation
- `totalInputTokens`, `totalOutputTokens`, `totalEstimatedCostUsd`
- Full `records[]` for drill-down
- Dev: `GET /api/debug/ai-cost`

### Acceptance failure mapping

| Production signal | Likely taxonomy |
|-------------------|-----------------|
| `failedSources` + `no_transcript` | `TRANSCRIPT_FAILURE` |
| `failedSources` + invalid metadata | `INGEST_FAILURE` |
| Low `claimsExtracted` | `EXTRACTION_FAILURE` |
| `evidenceIntegrityPass === false` | `EVIDENCE_FAILURE` |
| High `excludedSources` | `RELEVANCE_FAILURE` |
| User flags in acceptance form | `RELATIONSHIP_MISS`, `FALSE_RELATIONSHIP`, etc. |
| High `endToEndMs` for N videos | `PERFORMANCE_FAILURE` |

### Benchmark vs production diagnostic gap

Blind/benchmark runs log `pipelineStats` in reasoning output but **do not** populate `productionMeta`. Production adds ingest/analyze failure layer.

**Frozen V2 benchmark metrics:** Precision 100%, Recall 63.6%, zero false relationships — not changed this cycle.

### Inspection (dev)

```text
.data/synthesis-jobs/{jobId}/document.json
.data/product-acceptance/{synthesisId}.json
http://localhost:3000/dev/acceptance
```

---

## 7. 이번 작업에서 하지 않은 것

- Reasoning V2 blind recall chasing / semantic tuning
- Fixture-specific fixes / global threshold lowering
- V3 reasoning development
- UI 전체 redesign / DB 전체 redesign
- Automated live URL acceptance (this session)
- `product-acceptance-results.md` (live run 후 생성 예정)

---

*통합 원본: `youtube-e2e-audit.md`, `product-acceptance-readiness.md`, `production-pipeline-map.md`, `reasoning-v2-production-diagnostics.md`*
