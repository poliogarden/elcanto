# Reasoning V2 Production Diagnostics

**Date:** 2026-08-30  
**Engine:** `reasoning-v2.2` (frozen baseline preserved)

## Purpose

Trace synthesis quality failures in **production** without rebuilding blind fixtures. Diagnostics are stored on each completed job and visible in dev tooling.

---

## Where diagnostics live

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

---

## Funnel summary (multi-source)

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

---

## Per-source rows

Each voice in `diagnostics.perSource[]`:

| Field | Description |
|-------|-------------|
| `status` | `analyzed`, `failed`, `excluded` |
| `failureCode` / `failureMessage` | e.g. `no_transcript` |
| `transcriptOk` | false when transcript missing |
| `claimsExtracted` | claim count from analysis |
| `evidenceSupported` | claims with linked evidence |

---

## Performance phases (`perfSummary`)

| Phase | Captured |
|-------|----------|
| `individual_analysis` | All per-voice analyze (transcript + LLM) |
| `reasoning` | `runReasoningPipeline` wall time |
| `total` | Full job after claim |
| `individualAnalysisMs` | Wall clock analyze segment |
| `endToEndMs` | Analyze + reasoning total |

**Note:** Per-video metadata/transcript ms not split in job runner today — aggregate under `individual_analysis`. Future improvement: per-voice timing in `analyzeOneSource` without changing reasoning.

---

## Cost aggregation (`costSummary`)

Populated via `runWithAIContext({ costAccumulator })` + `buildSynthesisCostSummary()`:

- `byOperation`: calls, input/output tokens, cost per AI operation type
- `totalInputTokens`, `totalOutputTokens`, `totalEstimatedCostUsd`
- Full `records[]` for drill-down

Also: `GET /api/debug/ai-cost` for in-memory recent usage (dev).

---

## Acceptance failure mapping

| Production signal | Likely taxonomy |
|-------------------|-----------------|
| `failedSources` + `no_transcript` | `TRANSCRIPT_FAILURE` |
| `failedSources` + invalid metadata | `INGEST_FAILURE` |
| Low `claimsExtracted` | `EXTRACTION_FAILURE` |
| `evidenceIntegrityPass === false` | `EVIDENCE_FAILURE` |
| High `excludedSources` | `RELEVANCE_FAILURE` |
| User flags in acceptance form | `RELATIONSHIP_MISS`, `FALSE_RELATIONSHIP`, `JUDGMENT_FAILURE`, `UX_COMPREHENSION_FAILURE` |
| High `endToEndMs` for N videos | `PERFORMANCE_FAILURE` |

---

## Benchmark vs production diagnostic gap

Blind/benchmark runs log `pipelineStats` inside reasoning output but **do not** populate `productionMeta` (no job runner). Production jobs add ingest/analyze failure layer that benchmarks skip.

**Frozen V2 metrics (benchmark only):** Precision 100%, Recall 63.6%, zero false relationships — not re-run or changed in this cycle.

---

## Inspection commands (dev)

```text
# Job document with productionMeta
.data/synthesis-jobs/{jobId}/document.json

# Acceptance ratings
.data/product-acceptance/{synthesisId}.json

# Dashboard
http://localhost:3000/dev/acceptance
```
