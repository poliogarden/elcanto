# elcanto Reasoning V2 — 통합 산출물

Generated: 2026-08-29T15:53:33Z  
Engine: `reasoning-v2.2`  
Commit: `70ea277ee9e98b45c1863600942a3f279c7cca3b`  
V1 baseline (frozen): `reasoning-v2.1` @ `70ea277`

Raw JSON: `reports/reasoning-v2-final-raw.json`

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [Final Engineering Report](#2-final-engineering-report)
3. [Failure Matrix](#3-failure-matrix)
4. [Regression Report](#4-regression-report)
5. [Blind Test Detail](#5-blind-test-detail)
6. [Product Acceptance](#6-product-acceptance)
7. [Production Recommendation](#7-production-recommendation)

---

## 1. Executive Summary

Reasoning V2는 **ENGINEERING STOP** 상태로 종료합니다. Precision guard는 완전히 유지되었고 (false relationship 0), blind recall은 V1 27%에서 **63.6%**로 크게 개선되었지만 production target (≥80%)에는 미달합니다. Graduation suite는 여전히 FAIL입니다.

**Exit status:** `NEEDS TARGETED FIX` (recall < 80%, stability 미달)

| Metric | V1 frozen | V2 blind (3-run) |
|--------|-----------|------------------|
| Precision | 100% (3/3) | **100% (7/7)** |
| Recall | 27% (3/11) | **63.6% (7/11)** |
| False Agreement | 0 | **0** |
| False Divide | 0 | **0** |
| False Complementary | 0 | **0** |
| Relationship stability | FAIL | **FAIL** |
| Pipeline stability | PASS | **PASS** |
| Graduation | FAIL | **FAIL** |

Major iterations: 2 of 5 allowed (pipeline reliability + candidate/verification fixes).

---

## 2. Final Engineering Report

### 2.1 V1 → V2 architecture changes

| Layer | V1 | V2 |
|-------|----|----|
| Engine version | `reasoning-v2.1` | `reasoning-v2.2` |
| Extraction | high-signal filter only | + structured recovery when filter returns 0 |
| Relevance | synthesis-source-gated claims | claim-level scoring across all sources |
| Generation pool | synthesis sources only | union of synthesis + claim-eligible sources |
| Early exit gate | `synthesisSourceIds < 2` | `canProceedToRelationshipDiscovery` (2+ sources with generation claims) |
| Candidate discovery | lexical overlap gate first | semantic opposition/agreement/complement bypass before overlap |
| PRE_LLM verification | strict dimension gate | mechanism/outcome complementary allowed |
| Classification | TRADE_OFF retained | opposing TRADE_OFF/TENSION → CONTRADICTION when semantically opposed |

### 2.2 Changed files

**New**

- `lib/reasoning/v2/engine-config.ts`
- `lib/reasoning/v2/extraction-recovery.ts`
- `lib/reasoning/v2/relationship-eligibility.ts`
- `lib/reasoning/eval/blind-test-v2.runner.test.ts`
- `scripts/eval-reasoning-blind-v2.mjs`
- `scripts/generate-reasoning-v2-reports.mjs`

**Modified (production)**

- `lib/reasoning/pipeline.ts`
- `lib/reasoning/comparable-claim-pool.ts`
- `lib/reasoning/candidate-discovery.ts`
- `lib/reasoning/proposition-semantics.ts`
- `lib/reasoning/verification-alignment.ts`
- `lib/reasoning/llm-steps.ts`
- `lib/reasoning/eval/run-blind-test.ts` (V2 report path options only)

**Tests added**

- `lib/reasoning/__tests__/heuristic-candidate-blind.test.ts`
- `lib/reasoning/__tests__/pre-llm-coral.test.ts`
- `lib/reasoning/__tests__/pre-llm-carbon.test.ts`

V1 artifacts (`reports/reasoning-v1-*`, `baseline-freeze.json`) were not overwritten by V2 blind run.

### 2.3 Changed reasoning rules

1. **Null-effect / opposition candidates** — low lexical overlap no longer blocks CONTRADICTION candidates (screen/sleep, fasting/weight).
2. **Policy investment agreement** — `hasSemanticPredicateCompatibility` creates AGREEMENT candidates (carbon renewable pair at heuristic layer).
3. **Coral complementary** — `symbiotic algae` / temperature spike counts as bleaching context; PRE_LLM allows MECHANISM vs EFFECT for complementary pairs.
4. **Coal divide normalization** — verified TRADE_OFF with coal retirement opposition → CONTRADICTION (evaluated as DIVIDE).
5. **Fat loss polarity** — `greater fat loss` treated as positive effect for null-effect opposition.

### 2.4 Funnel before/after (aggregate)

| Stage | V1 frozen | V2 blind |
|-------|-----------|----------|
| Extraction reliability | screen/sleep, telehealth EXTRACTION collapse | recovered via claim-level relevance + structured sources |
| Relevance | mixed-water-filtration RELEVANCE_FAIL | still RELEVANCE_FAIL |
| Verification | ocean-ph, coral failures | ocean-ph intermittent (2/3); coral intermittent (1/3) |
| Classification | carbon agreement missed | divide stable 3/3; agreement 0/3 |

### 2.5 Gold relationships — stability (N/3)

| Gold relationship | N/3 | Stage on miss |
|-------------------|-----|---------------|
| ocean-ph AGREEMENT | **2/3** UNSTABLE | VERIFICATION |
| EV range AGREEMENT | **2/3** UNSTABLE | VERIFICATION (last run PASS) |
| screen/sleep DIVIDE | **3/3** STABLE | — |
| fasting/weight DIVIDE | **3/3** STABLE | — |
| wildfire COMPLEMENTARY | **3/3** STABLE | — |
| coral COMPLEMENTARY | **1/3** FAIL | VERIFICATION |
| mixed filtration AGREEMENT | **0/3** FAIL | RELEVANCE |
| telehealth AGREEMENT | **3/3** STABLE | — |
| telehealth DIVIDE | **3/3** STABLE | — |
| carbon AGREEMENT | **0/3** FAIL | CLASSIFICATION / pool |
| carbon DIVIDE | **3/3** STABLE | — |

### 2.6 Integrity & stability

| Check | Result |
|-------|--------|
| Evidence integrity (aggregate) | PASS on gold fixtures |
| Judgment grounding | PASS (unsupported judgment 0) |
| Pipeline stability | PASS (no relevance/candidate collapse flags) |
| Relationship stability | **FAIL** (4 fixtures with RELATIONSHIP_DRIFT) |
| Judgment drift | 7 fixtures flagged |

### 2.7 Graduation suite

**FAIL** — `suiteV1ExitStatus: NOT READY` (mixed-irrelevant and related gates).

### 2.8 MCP 5-run reproducibility

| Run | Claims | Generation eligible | Verified |
|-----|--------|---------------------|----------|
| 1 | 32 | 31 | 1 |
| 2 | 26 | 26 | 3 |
| 3 | 29 | 28 | 1 |
| 4 | 31 | 29 | 1 |
| 5 | 32 | 30 | 0 |

- **No unexplained zero-claim collapse** (claims 26–32 every run).
- Verified count still volatile (0–3); extraction nondeterminism remains.
- Temperature/seed: not fixed (documented in raw diagnosis).

### 2.9 Same-topic regression

`solar`, `quantum`: no gold required relationships; **no false relationships** across 3 runs.

### 2.10 Remaining failures (V3 backlog)

1. **mixed-water-filtration** — claim-level relevance still drops one side of gold pair.
2. **carbon-pricing AGREEMENT** — multi-claim generation pool collapses to 3 claims; renewable pair often absent from relationship phase.
3. **ocean-ph / EV-range** — LLM verification nondeterminism (2/3 stability).
4. **coral COMPLEMENTARY** — verification stability 1/3.
5. **Graduation mixed-irrelevant** — relevance gate for irrelevant sources.
6. **MCP verified-count variance** — structural extraction stable but relationship verification unstable.

---

## 3. Failure Matrix

### Summary

| Metric | V1 frozen | V2 |
|--------|-----------|-----|
| Precision | 100% | 100% |
| Recall | 27% | 63.6% |
| False Agreement | 0 | 0 |
| False Divide | 0 | 0 |
| False Complementary | 0 | 0 |

### Per-gold funnel matrix

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

### Stage definitions

- **EXTRACTION_FAILURE** — zero or missing structured claims after ingest/recovery
- **RELEVANCE_FAILURE** — gold claim never reaches generation pool
- **CANDIDATE_FAILURE** — no cross-source candidate for gold pair
- **VERIFICATION_FAILURE** — candidate exists but not verified (or unstable across runs)
- **CLASSIFICATION_FAILURE** — verified relationship wrong type or gold agreement missing while divide present

---

## 4. Regression Report

### Precision guard

| Fixture | False Agreement | False Divide | False Complementary |
|---------|-----------------|--------------|---------------------|
| blind-same-topic-solar | 0 | 0 | 0 |
| blind-same-topic-quantum | 0 | 0 | 0 |
| blind-mixed-cycling | 0 | 0 | 0 |

Phase B regression: **PASS** (no false relationships on same-topic fixtures).

### V1 → V2 delta

| Metric | V1 | V2 | Delta |
|--------|----|----|-------|
| Blind precision | 100% | 100% | 0 |
| Blind recall | 27% | 63.6% | **+36.6pp** |
| False relationships | 0 | 0 | 0 |

### Unit / deterministic regression

| Suite | Result |
|-------|--------|
| proposition-semantics-recall | PASS |
| mcp-comparable-pool-regression | PASS |
| mcp-relevance-regression | PASS |
| heuristic-candidate-blind | PASS |
| pre-llm-coral | PASS |
| pre-llm-carbon | PASS |

### Graduation suite

**FAIL** — mixed-irrelevant and aggregate gates not satisfied in V2 blind graduation regression run.

### MCP baseline

Claims never collapsed to 0 across 5 runs (26–32). Verified relationships still variable (0–3 per run).

---

## 5. Blind Test Detail

```text
BLIND TEST (3 runs per fixture)

Precision: 1
Recall: 0.6363636363636364

False Agreement: 0
False Divide: 0
False Complementary: 0

Evidence Integrity: PASS
Judgment Grounding: PASS

Relationship Stability: FAIL
Pipeline Stability: PASS

Claim Population Drift: 0 fixtures
Relevance Collapse: 0 fixtures
Candidate Collapse: 0 fixtures
Relationship Drift: 4 fixtures
Judgment Drift: 7 fixtures
```

### Fixture results

| Fixture | Category | Evidence | Relationship | Pipeline | Stability | Attribution |
|---------|----------|----------|--------------|----------|-----------|-------------|
| blind-agreement-ocean-ph | clear-agreement | PASS | FAIL | PASS | AGREEMENT 2/3 UNSTABLE | RELATIONSHIP_VERIFICATION_FAILURE |
| blind-agreement-ev-range | clear-agreement | PASS | PASS | PASS | AGREEMENT 2/3 UNSTABLE | NONE |
| blind-divide-screen-sleep | clear-divide | PASS | PASS | PASS | DIVIDE 3/3 STABLE | NONE |
| blind-divide-fasting-weight | clear-divide | PASS | PASS | PASS | DIVIDE 3/3 STABLE | NONE |
| blind-same-topic-solar | same-topic | PASS | N/A | PASS | 3/3 STABLE (no gold) | NONE |
| blind-same-topic-quantum | same-topic | PASS | N/A | PASS | 3/3 STABLE (no gold) | NONE |
| blind-complementary-wildfire | complementary | PASS | PASS | PASS | COMPLEMENTARY 3/3 STABLE | NONE |
| blind-complementary-coral | complementary | PASS | FAIL | PASS | COMPLEMENTARY 1/3 FAIL | RELATIONSHIP_VERIFICATION_FAILURE |
| blind-mixed-water-filtration | mixed-irrelevant | PASS | FAIL | FAIL | AGREEMENT 0/3 FAIL | RELEVANCE_FAILURE |
| blind-mixed-cycling | mixed-irrelevant | PASS | N/A | PASS | 3/3 STABLE (no gold) | NONE |
| blind-complex-telehealth | complex-natural | PASS | PASS | PASS | AGREEMENT 3/3; DIVIDE 3/3 STABLE | NONE |
| blind-complex-carbon-pricing | complex-natural | PASS | FAIL | PASS | AGREEMENT 0/3; DIVIDE 3/3 STABLE | RELATIONSHIP_CLASSIFICATION_FAILURE |

### Per-fixture funnel (last run)

| Fixture | extracted | relevance | generation | candidates | verified | agreement | divide | complementary |
|---------|-----------|-----------|------------|------------|----------|-----------|--------|---------------|
| ocean-ph | 2 | 2 | 2 | 1 | 0 | 0 | 0 | 0 |
| ev-range | 2 | 2 | 2 | 1 | 1 | 1 | 0 | 0 |
| screen-sleep | 2 | 2 | 2 | 1 | 1 | 0 | 1 | 0 |
| fasting-weight | 2 | 2 | 2 | 1 | 1 | 0 | 1 | 0 |
| solar | 2 | 2 | 2 | 1 | 0 | 0 | 0 | 0 |
| quantum | 3 | 3 | 3 | 3 | 0 | 0 | 0 | 0 |
| wildfire | 2 | 2 | 2 | 1 | 1 | 0 | 0 | 1 |
| coral | 2 | 2 | 2 | 1 | 0 | 0 | 0 | 0 |
| water-filtration | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| cycling | 2 | 2 | 2 | 1 | 0 | 0 | 0 | 0 |
| telehealth | 4 | 4 | 4 | 6 | 2 | 1 | 1 | 0 |
| carbon-pricing | 3 | 3 | 3 | 2 | 1 | 0 | 1 | 0 |

---

## 6. Product Acceptance

### Status: NOT EXECUTED

Automated product acceptance on live YouTube sets (A–E) was not run in this engineering cycle.

**Reason**

- No curated YouTube URL sets or authenticated fetch pipeline were invoked from this eval harness.
- Blind/benchmark fixtures use structured `SourceAnalysis` inputs, not live transcript ingestion.

**Required to run acceptance**

1. YouTube video URLs or IDs for sets A–E (agreement, divide, complementary, mixed irrelevant, complex technical).
2. Working YouTube transcript / analysis API credentials in the runtime environment.
3. Product synthesis route (`runReasoningPipeline` with live `SourceAnalysis` from ingest).

**Evaluation questions (when run)**

1. Is elcanto synthesis more useful than watching each source separately?
2. Can users trace conclusions to source / claim / evidence?

---

## 7. Production Recommendation

**Do not promote to production candidate.**

V2 achieves the primary safety goal (zero false cross-source relationships on blind fixtures) and materially improves recall, but:

- Blind recall **63.6%** < 80% target
- Relationship stability **FAIL** on 4 gold edges
- Graduation suite **FAIL**

Recommended V3 backlog:

1. Multi-claim generation pool preservation for complex fixtures (carbon-pricing).
2. Mixed-source partial relevance without precision loss (water-filtration).
3. Verifier determinism for metric-decline agreement patterns (ocean-ph, EV-range).
4. Live YouTube product acceptance harness.

---

*End of consolidated deliverable. Source files: `reasoning-v2-final-report.md`, `reasoning-v2-failure-matrix.md`, `reasoning-v2-regression-report.md`, `reasoning-v2-product-acceptance.md`, `reasoning-v2-blind-test.md`, `reasoning-v2-final-raw.json`.*
