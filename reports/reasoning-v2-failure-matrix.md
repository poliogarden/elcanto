# Reasoning V2 Failure Matrix

Generated from V1 baseline + V2 blind 3-run raw (`reports/reasoning-v2-final-raw.json`).

## Summary

| Metric | V1 frozen | V2 |
|--------|-----------|-----|
| Precision | 100% | 100% |
| Recall | 27% | 63.6% |
| False Agreement | 0 | 0 |
| False Divide | 0 | 0 |
| False Complementary | 0 | 0 |

## Per-gold funnel matrix

| Fixture | Gold | Extracted | Relevance | Candidate | Verify | Classify | Final | Attribution |
|---------|------|-----------|-----------|-----------|--------|----------|-------|-------------|
| ocean-ph | AGREEMENT | OK | OK | OK | **INTERMITTENT** | OK when verified | 2/3 | VERIFICATION |
| ev-range | AGREEMENT | OK | OK | OK | **INTERMITTENT** | OK when verified | 2/3 | VERIFICATION |
| screen-sleep | DIVIDE | OK | OK | OK | OK | OK | 3/3 | — |
| fasting-weight | DIVIDE | OK | OK | OK | OK | OK | 3/3 | — |
| wildfire | COMPLEMENTARY | OK | OK | OK | OK | OK | 3/3 | — |
| coral | COMPLEMENTARY | OK | OK | OK | **INTERMITTENT** | OK when verified | 1/3 | VERIFICATION |
| mixed-filtration | AGREEMENT | OK | **FAIL** | — | — | — | 0/3 | RELEVANCE |
| telehealth | AGREEMENT | OK | OK | OK | OK | OK | 3/3 | — |
| telehealth | DIVIDE | OK | OK | OK | OK | OK | 3/3 | — |
| carbon | AGREEMENT | OK | PARTIAL | **MISS** | — | **FAIL** | 0/3 | CLASSIFICATION |
| carbon | DIVIDE | OK | OK | OK | OK | OK | 3/3 | — |

## Stage definitions

- **EXTRACTION_FAILURE** — zero or missing structured claims after ingest/recovery
- **RELEVANCE_FAILURE** — gold claim never reaches generation pool
- **CANDIDATE_FAILURE** — no cross-source candidate for gold pair
- **VERIFICATION_FAILURE** — candidate exists but not verified (or unstable across runs)
- **CLASSIFICATION_FAILURE** — verified relationship wrong type or gold agreement missing while divide present
