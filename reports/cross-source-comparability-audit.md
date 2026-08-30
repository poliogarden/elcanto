# Cross-Source Comparability Audit

**Date:** 2026-08-30

## Contract

Cross-source relationship candidate requires:

```text
question aligned (DIRECT/SUPPORTING)
AND cross-source proposition comparable (shared proposition probe)
AND evidence supported (existing gates)
```

**Not sufficient:** generic semantic similarity, same broad topic, both mention success/competition/business.

## Shared proposition probe

`lib/reasoning/v2/shared-proposition-probe.ts` — before verification:

| Class | Candidate allowed |
|-------|-------------------|
| EXACT, COMPATIBLE, OPPOSING, COMPLEMENTARY | Yes |
| TOPIC_ONLY, DIFFERENT_DIMENSION, UNRELATED | No |

Uses `assessMinimumSharedProposition` + semantic bypass for benchmark-stable pairs (numeric equivalence, policy opposition, complementary hazard patterns).

## Candidate quality gate

`lib/reasoning/v2/candidate-quality-gate.ts` — applied in `generateRelationshipCandidates()` **before** verifier:

Rejects:

- Malformed / transcript fragments (`claim-shape-guards.ts`)
- Generic cross-source anchors ("marketing is about values", "competition occurs…")
- LOW_QUESTION_ALIGNMENT pairs (CONTEXTUAL/UNRELATED claims)
- TOPIC_ONLY / DIFFERENT_DIMENSION / UNRELATED probes

## Candidate quality metrics (`pipelineStats`)

| Metric | Description |
|--------|-------------|
| `candidateQualityInput` | Candidates before comparability filter |
| `questionAlignedCandidates` | Pairs passing alignment |
| `sharedPropositionCandidates` | Pairs passing probe |
| `topicOnlyRejected` | Topic overlap only |
| `differentDimensionRejected` | Incompatible dimensions |
| `genericSuppressed` | Generic anchor claims |
| `malformedSuppressed` | Fragment/malformed claims |

## Audit samples (production failure case)

| Pair | Probe result | Correct action |
|------|--------------|----------------|
| Debate/competition ↔ find what you're good at | UNRELATED / DIFFERENT_DIMENSION | Reject candidate |
| 53% accuracy ↔ marketing values | UNRELATED | Reject candidate |
| Same EV range miles vs km (benchmark) | EXACT via numeric bypass | Allow → verifier |

## BEFORE / AFTER (expected)

| Stage | Before (observed) | After (target) |
|-------|-------------------|----------------|
| Funnel usable | 75 | Lower (CONTEXTUAL removed) |
| Generation eligible | 28 | Lower |
| Raw heuristic candidates | ~35 | Similar |
| **Pre-verifier candidates** | 35 | **Near 0 for Case 1** |
| Verified | 0 | 0 (GOOD ZERO) |
| Meaningful candidate ratio | Low | Higher when comparable claims exist |

## Regression guard

Blind V2 test suite passed after changes. Stable gold fixtures (screen-sleep, fasting, wildfire, telehealth, carbon divide) not regressed in automated blind run.
