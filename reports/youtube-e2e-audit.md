# YouTube E2E Audit

**Date:** 2026-08-30  
**Scope:** Real-user flow from URL paste to synthesis result (no Reasoning V2 benchmark changes)

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| URL → metadata → job → result path | **Implemented** | Primary path via `/api/synthesis/jobs` |
| Reasoning V2 in production | **Implemented** | `reasoning-v2.2`, same `pipeline.ts` as eval |
| Partial failure | **Implemented** | Continues with ≥1 successful analysis |
| Evidence / timestamp links | **Implemented** | `youtubeWatchUrl`; no fake timestamps in adapter |
| Production diagnostics | **Implemented** | `productionMeta.diagnostics` + perf/cost |
| Acceptance mode | **Implemented** | `/dev/acceptance` + API |
| Live URL acceptance runs | **Not executed** | No `OPENAI_API_KEY` in CI agent environment |

**E2E readiness:** **READY** for user-driven testing with API credentials. Automated live acceptance sets A–E were not run in this session.

---

## 1. URL ingestion

### Supported (code-verified)

| Format | Parser | Test coverage |
|--------|--------|---------------|
| `youtube.com/watch?v=` | `lib/youtube/url.ts` | `parse-paste-input.test.ts` |
| `youtu.be/` | same | yes (`dQw4w9WgXcQ`) |
| `youtube.com/shorts/` | same | code path only |
| `youtube.com/embed/`, `/v/` | same | — |
| Bare 11-char ID | same | yes |
| Multi-URL paste (whitespace/comma) | `parse-paste-input.ts` | yes |
| Playlist ID (`list=`, `/playlist/`) | `playlist-url.ts` | `phase2.test.ts` |

### Limitations

- **Timestamp in input URL** (`&t=`, `start=`): video ID extracted; start offset not used at ingest (timestamps come from transcript segments).
- **Home workspace**: multi-video paste works; **playlist paste in home search** may fall through to text search — use `source-picker.tsx` + `POST /api/youtube/playlist` for full playlist flow.
- **Private / deleted / age-restricted**: metadata API and transcript fetch return failures; mapped to per-voice `SourceFailure` codes (`no_transcript`, `unavailable`, etc.).

---

## 2. Transcript → analysis

- Provider: `youtube-transcript-provider.ts` (auto + manual captions)
- Languages: provider attempts available tracks; Korean/English depend on video captions
- Cache: `video-cache.ts` avoids repeat transcript/analysis cost
- Section failures: `hierarchical-analyze.ts` tracks `failedSectionIds`; merge proceeds with partial coverage

---

## 3. Production vs benchmark contract

Both paths feed `runReasoningPipeline({ sources: SourceAnalysis[] })`.

Production adds live extraction variance; benchmark uses deterministic synthetic claims. **No separate reasoning code path** — quality differences are upstream of reasoning.

---

## 4. UI comprehension (existing design)

- Agreement / divide / complementary: `SurvivalBoard` + `RelationshipExplorerEmergent`, `EvidenceDrawer`
- Excluded sources: banner + EXCLUDED badges on source strip
- Failed analyses: `analysis-progress.tsx` during job; `SurvivalBoard` banner post-complete
- Judgment: `JudgmentProvenance`, reasoning graph explorer
- Uncertain relationships: only `verificationStatus === 'SUPPORTED'` surfaced in primary relationship views; diagnostic tiers not exposed to users

---

## 5. Test URLs in repository

| ID | Use |
|----|-----|
| `dQw4w9WgXcQ`, `jNQXAC9IVRw` | Unit tests (metadata shape, job claim) |
| `bVJFh0d7NZY`, `iD9xKlzp_Ps`, `q22YTPeTgHE` | MCP 3-video eval baseline (reports) |

No curated acceptance sets A–E committed as fixtures. User can label test sets in `/dev/acceptance` via `testSetLabel` (API field).

---

## 6. Regression tests run (2026-08-30)

- `lib/production` — 3 passed
- `lib/youtube` + `lib/synthesis` — 52 passed

---

## 7. Blocking issues for live acceptance

1. **Credentials required:** `OPENAI_API_KEY` for analysis + reasoning LLM steps
2. **Network:** YouTube transcript/metadata fetch from runtime environment
3. **Optional:** Supabase for cross-session persistence (local `.data/synthesis-jobs` works in dev)

No code blockers identified for user-initiated live testing.
