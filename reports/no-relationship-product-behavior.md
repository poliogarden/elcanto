# No-Relationship Product Behavior

**Date:** 2026-08-30

## Principle

**Verified relationships = 0** is not always failure.

| Type | Meaning |
|------|---------|
| **GOOD ZERO** | Sources don't share a comparable question; system correctly withholds relationships |
| **BAD ZERO** | Clear agreement/divide exists but system missed it |

## Reason taxonomy

`lib/reasoning/v2/no-relationship-product.ts`:

- `NO_SHARED_QUESTION`
- `INSUFFICIENT_COMPARABLE_CLAIMS`
- `SOURCES_ADDRESS_DIFFERENT_DIMENSIONS`
- `INSUFFICIENT_EVIDENCE`
- `VERIFICATION_REJECTED`
- `CANDIDATE_QUALITY_FILTERED`

Stored on `pipelineStats.noRelationshipReason` and `goodZeroResult`.

## User-facing messaging

When `verified.length === 0` and GOOD ZERO or weak-evidence gate:

Replaces generic "Insufficient verified relationships" with source-grounded explanation, e.g.:

> These videos are not answering the same question.  
> Video 1 directly addresses 53% accuracy meaning; Video 2 discusses failure and personal strength; Video 3 discusses marketing strategy.  
> There is not enough comparable evidence for defensible cross-source agreement or divide.

Korean output when `outputLanguage === 'ko'`.

Applied via `applyNoRelationshipJudgmentPatch()` to `judgment` + `synthesis` headline/summary.

## Acceptance dashboard

`/dev/acceptance` — new field:

**Zero relationship (correct?)** — `good | partial | bad`

Maps to `zeroRelationshipResult` on `ProductAcceptanceRecord` for GOOD ZERO vs BAD ZERO tracking.

## Verifier role

Verifier threshold **not lowered**. When pre-filter removes nonsensical candidates:

- `CANDIDATE_VERIFICATION_COLLAPSE` may still fire if raw heuristic count was high
- `goodZeroResult: true` indicates collapse was appropriate
- Audit rejected candidates via `verificationDiagnosticsBundle` (existing)

## Product recommendation

For mixed-topic video sets (Case 1):

1. Expect **GOOD ZERO** — no forced Agreement/Divide UI
2. Read judgment/synthesis for **why sources don't compare**
3. Rate zero-relationship result on acceptance dashboard
4. Use per-source analysis when only one video answers the question

For same-proposition sets (Case 2/3): comparability gate should allow candidates through to verifier; relationships should appear when evidence supports them.
