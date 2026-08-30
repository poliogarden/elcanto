# Product Acceptance Readiness

**Date:** 2026-08-30  
**Goal:** Repeatable real-YouTube product value validation (not blind recall improvement)

## Readiness verdict: **READY (user-driven)**

The production-like acceptance harness is in place. Automated multi-set live runs were **not executed** in this engineering session (missing API key in agent environment).

---

## Acceptance mode

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

`summarizeAcceptanceBacklog()` counts failure taxonomy across saved ratings — surfaces whether UX vs reasoning should drive V3.

---

## Failure taxonomy (supported in UI)

`INGEST_FAILURE`, `TRANSCRIPT_FAILURE`, `EXTRACTION_FAILURE`, `EVIDENCE_FAILURE`, `RELEVANCE_FAILURE`, `RELATIONSHIP_MISS`, `FALSE_RELATIONSHIP`, `JUDGMENT_FAILURE`, `UX_COMPREHENSION_FAILURE`, `PERFORMANCE_FAILURE`

---

## How to run acceptance (operator checklist)

1. `pnpm dev` with `OPENAI_API_KEY` set
2. Paste 3–5 YouTube URLs on home → Run synthesis
3. Wait for `/synthesis/[id]` result
4. Open `/dev/acceptance` → select job → rate dimensions
5. Repeat for sets A–E (agreement, divide, complementary, mixed, complex)
6. Review backlog summary on acceptance dashboard

### Suggested test sets (not pre-loaded — user picks URLs)

| Set | Intent | Videos |
|-----|--------|--------|
| A Agreement | Same topic, similar conclusions | 3 |
| B Divide | Same topic, opposing conclusions | 3–5 |
| C Complementary | Same phenomenon, different angles | 3–5 |
| D Mixed | Related + irrelevant | 4–6 |
| E Complex | Multi-claim technical/economic | 5+ |

Label each rating with `testSetLabel` via API if extending the form.

---

## Production telemetry (per synthesis)

Stored in `document.productionMeta`:

- Engine/model versions
- `analyzedCount`, `failedCount`, `requestedCount`
- Funnel: claims → relevance → candidates → verified → agreement/divide/complementary
- Per-source: transcript ok, claims, evidence-supported counts
- `costSummary`: by operation, tokens, estimated USD
- `perfSummary`: `individual_analysis`, `reasoning`, `total` phases + end-to-end ms

---

## What was explicitly NOT done

- No Reasoning V2 semantic / threshold / verifier tuning
- No fixture-specific fixes
- No automated acceptance on live URLs (this session)
- No UI redesign

---

## Next action for user

> Pick videos, run elcanto, rate on `/dev/acceptance`.

That is the only remaining step to populate `product-acceptance-results.md` and V3 backlog data.
