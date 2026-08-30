# Reasoning V2 Final Report

Generated: 2026-08-29T15:53:33Z  
Engine: `reasoning-v2.2`  
V1 baseline: `reasoning-v2.1` @ commit `70ea277` (frozen)

## Executive summary

Reasoning V2는 **ENGINEERING STOP** 상태로 종료합니다. Precision guard는 완전히 유지되었고( false relationship 0 ), blind recall은 V1 27%에서 **63.6%**로 크게 개선되었지만 production target(≥80%)에는 미달합니다. Graduation suite는 여전히 FAIL입니다.

**Exit status:** `NEEDS TARGETED FIX` (recall < 80%, stability 미달)

---

## 1. V1 → V2 architecture changes

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

---

## 2. Changed files

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

---

## 3. Changed reasoning rules

1. **Null-effect / opposition candidates** — low lexical overlap no longer blocks CONTRADICTION candidates (screen/sleep, fasting/weight).
2. **Policy investment agreement** — `hasSemanticPredicateCompatibility` creates AGREEMENT candidates (carbon renewable pair at heuristic layer).
3. **Coral complementary** — `symbiotic algae` / temperature spike counts as bleaching context; PRE_LLM allows MECHANISM vs EFFECT for complementary pairs.
4. **Coal divide normalization** — verified TRADE_OFF with coal retirement opposition → CONTRADICTION (evaluated as DIVIDE).
5. **Fat loss polarity** — `greater fat loss` treated as positive effect for null-effect opposition.

---

## 4–7. Funnel before/after (aggregate)

| Stage | V1 frozen | V2 blind |
|-------|-----------|----------|
| Extraction reliability | screen/sleep, telehealth EXTRACTION collapse | recovered via claim-level relevance + structured sources |
| Relevance | mixed-water-filtration RELEVANCE_FAIL | still RELEVANCE_FAIL |
| Verification | ocean-ph, coral failures | ocean-ph intermittent (2/3); coral intermittent (1/3) |
| Classification | carbon agreement missed | divide stable 3/3; agreement 0/3 |

---

## 8–9. Blind Precision / Recall

| Metric | V1 | V2 |
|--------|----|----|
| Precision | 100% (3/3) | **100% (7/7)** |
| Recall | 27% (3/11) | **63.6% (7/11)** |
| False Agreement | 0 | **0** |
| False Divide | 0 | **0** |
| False Complementary | 0 | **0** |

---

## 10. Gold relationships — stability (N/3)

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

---

## 11–13. False relationships

| Type | Count |
|------|-------|
| False Agreement | 0 |
| False Divide | 0 |
| False Complementary | 0 |

Precision guard fixtures (solar, quantum, cycling): no false relationships.

---

## 14–16. Integrity & stability

| Check | Result |
|-------|--------|
| Evidence integrity (aggregate) | PASS on gold fixtures |
| Judgment grounding | PASS (unsupported judgment 0) |
| Pipeline stability | PASS (no relevance/candidate collapse flags) |
| Relationship stability | **FAIL** (4 fixtures with RELATIONSHIP_DRIFT) |
| Judgment drift | 7 fixtures flagged |

---

## 17. Graduation suite

**FAIL** — `suiteV1ExitStatus: NOT READY` (mixed-irrelevant and related gates).

---

## 18. MCP 5-run reproducibility

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

---

## 19. Same-topic regression

`solar`, `quantum`: no gold required relationships; **no false relationships** across 3 runs.

---

## 20. Remaining failures (V3 backlog)

1. **mixed-water-filtration** — claim-level relevance still drops one side of gold pair.
2. **carbon-pricing AGREEMENT** — multi-claim generation pool collapses to 3 claims; renewable pair often absent from relationship phase.
3. **ocean-ph / EV-range** — LLM verification nondeterminism (2/3 stability).
4. **coral COMPLEMENTARY** — verification stability 1/3.
5. **Graduation mixed-irrelevant** — relevance gate for irrelevant sources.
6. **MCP verified-count variance** — structural extraction stable but relationship verification unstable.

---

## 21. YouTube product acceptance

**Not executed.** See `reports/reasoning-v2-product-acceptance.md`.

---

## 22. Production recommendation

**Do not promote to production candidate.**

V2 achieves the primary safety goal (zero false cross-source relationships on blind fixtures) and materially improves recall, but:

- Blind recall **63.6%** < 80% target
- Relationship stability **FAIL** on 4 gold edges
- Graduation suite **FAIL**

Recommended path: V3 backlog focused on (a) multi-claim generation pool preservation for complex fixtures, (b) mixed-source partial relevance without precision loss, (c) verifier determinism for metric-decline agreement patterns, (d) live YouTube acceptance harness.

---

## Major iterations performed

1. **Iteration 1** — V2 pipeline (extraction recovery, claim-level relevance, participating source union).
2. **Iteration 2** — Candidate semantic bypass, complementary PRE_LLM, opposition polarity, TRADE_OFF normalization.

**Engineering stop** at iteration 2 of 5 allowed — target not met; no further benchmark chasing in this cycle.
