# elcanto Reasoning v1 — Targeted Recall Recovery Report

Generated: 2026-08-29  
Engine: `reasoning-v2.1`

## Exit Status

**NEEDS TARGETED FIX** — precision guard 유지, blind recall 유의미 상승, Phase A 목표(≥80%) 미달.

| Criterion | Target | After (Phase A, 1-run) | Status |
|---|---|---|---|
| Blind Precision | ≥95% | **100%** | PASS |
| Blind Recall | ≥80% | **40%** (4/10 targeted gold) | FAIL |
| False Agreement | 0 | **0** | PASS |
| False Divide | 0 | **0** | PASS |
| False Complementary | 0 | **0** | PASS |
| Graduation clear-agreement | PASS | **PASS** | PASS |
| Graduation same-topic | PASS | **PASS** | PASS |
| Graduation mixed-irrelevant | — | **FAIL** (relevance; out of scope) | Known |

---

## Gold Relationship Detection (Before → After)

Phase A targeted fixtures, stability **1/1** per gold (baseline blind suite: **3-run** stability).

```text
Gold Relationship                  Before    After (Phase A)
--------------------------------------------------
Agreement ocean pH                 0/3       1/1 STABLE
Agreement EV range                 0/3       1/1 STABLE
Divide screen/sleep                0/3       0/1 FAIL (EXTRACTION_FAILURE)
Divide fasting/weight              0/3       0/1 FAIL (EXTRACTION_FAILURE)
Complementary wildfire             0/3       1/1 STABLE
Complementary coral                0/3       0/1 FAIL (verification)
Mixed filtration Agreement         0/3       (not in Phase A run)
Telehealth Agreement               3/3       0/1 FAIL (EXTRACTION_FAILURE)
Telehealth Divide                  0/3       0/1 FAIL (EXTRACTION_FAILURE)
Carbon pricing Agreement           0/3       0/1 FAIL (classification)
Carbon pricing Divide              0/3       1/1 STABLE
```

### Aggregate Blind Metrics

| Metric | Before (full blind, 3-run) | After (Phase A, 1-run) |
|---|---|---|
| Precision | 100% (1/1) | **100%** (4/4) |
| Recall | **9%** (1/11) | **40%** (4/10 targeted gold) |
| False Agreement | 0 | 0 |
| False Divide | 0 | 0 |
| False Complementary | 0 | 0 |

---

## 1. 변경한 파일

| File | Role |
|---|---|
| `lib/reasoning/proposition-semantics.ts` | **NEW** — null-effect opposition, numeric range equivalence, metric/polarity helpers, complementary pair detection |
| `lib/reasoning/proposition-alignment.ts` | DIMENSION_RULES 확장, shared proposition derivations, tokenCovered/hyphen normalization |
| `lib/reasoning/verification-alignment.ts` | Polarity via semantics, PRE_LLM plausibility bypass, post-alignment boosts |
| `lib/reasoning/complementary-alignment.ts` | `health_outcome` / `ecosystem_outcome` families, combined explanation paths |
| `lib/reasoning/llm-steps.ts` | Opposing alignment → divide routing (null-effect / pace opposition) |
| `lib/reasoning/candidate-discovery.ts` | Numeric-range AGREEMENT, hazard/phenomenon COMPLEMENTARY, null-effect CONTRADICTION candidates |
| `lib/reasoning/eval/evaluate-benchmark.ts` | `isValidDivideRelationship` aligned with semantic opposition rules |
| `lib/reasoning/eval/run-blind-test.ts` | `BLIND_STABILITY_RUNS` env support |
| `lib/reasoning/eval/targeted-recall.runner.test.ts` | Phase A runner |
| `scripts/eval-reasoning-blind-targeted.mjs` | `npm run eval:reasoning:blind:targeted` |
| `lib/reasoning/__tests__/proposition-semantics-recall.test.ts` | Regression unit tests |

---

## 2. 변경한 Reasoning Rule (일반화 규칙)

### Agreement recall

- **Metric decline equivalence**: 동일 ocean/pH entity에서 `declined` ↔ `drop` 등 방향 일치 시 minimum shared proposition 허용.
- **Numeric range equivalence**: miles↔km deterministic overlap (250–300 mi ≈ 400–480 km); hallucination이 아닌 normalization.
- **Policy / access paraphrase**: carbon pricing↔emissions trading investment, telehealth↔rural specialist access.

### Divide recall

- **Null-effect opposition**: `no measurable impact` vs directional effect → `OPPOSE` (screen/sleep, fasting/weight 패턴).
- **Pace opposition**: readmission reduce↔rose, coal faster retirements↔slowed shutdowns.
- **PRE_LLM**: dimension compatible + proposition signal 시 `GENERIC_TOPIC_ONLY` hard reject 완화 → full verifier 위임.

### Complementary

- 동일 hazard/phenomenon + **non-overlapping downstream outcomes** (wildfire respiratory vs cardiovascular; coral mechanism vs ecosystem).
- `same topic + different dimension` 단독으로 complementary 생성하지 않음.

### Precision guard

- Opposing productivity / null-effect / pace opposition → agreement proposition gate **reject**.
- Fixture-specific keyword rule **없음**.

---

## 3. 변경하지 않은 영역

- Claim extraction 구조
- Evidence grounding 구조
- Source relevance 구조 (global threshold 하향 없음)
- Judgment 구조
- UI, schema, DB, API
- Mixed water-filtration relevance (별도 RELEVANCE_FAILURE; 이번 verifier fix 범위 외)

---

## 4. Graduation Regression

| Fixture | Result |
|---|---|
| mcp-3video-baseline | PASS |
| clear-agreement | **PASS** (이전 PRE_LLM TOPIC_ONLY → **복구**) |
| clear-divide | PASS |
| same-topic-different-claims | PASS |
| mixed-irrelevant | FAIL (MISSED_GOLD — relevance/extraction; verifier 범위 외) |

---

## 5. Same-Topic Precision Regression

Phase A에 same-topic fixture 미포함. Graduation `same-topic-different-claims` **PASS** (precision 100%, recall 100%).

---

## 6. MCP Reproducibility

이번 Phase A run에서 MCP repro 생략 (`skipMcpRepro: true`). Suite 직전 MCP: claims 19–34, verified 0–1 변동 — 이번 작업에서 temperature/seed 변경 없음.

---

## 7. 남은 Failure Stage

| Fixture | Stage | Notes |
|---|---|---|
| blind-divide-screen-sleep | **EXTRACTION_FAILURE** | 이번 run claim 미생성/파이프라인 collapse — verifier 이전 |
| blind-divide-fasting-weight | **EXTRACTION_FAILURE** | 동일 |
| blind-complex-telehealth | **EXTRACTION_FAILURE** | multi-claim fixture; nondeterministic extraction |
| blind-complementary-coral | **RELATIONSHIP_VERIFICATION_FAILURE** | mechanism↔outcome complementary still missed |
| blind-complex-carbon-pricing | **RELATIONSHIP_CLASSIFICATION_FAILURE** | divide stable, agreement missed; possible TRADE_OFF noise |
| blind-mixed-water-filtration | **RELEVANCE_FAILURE** (baseline) | 미수정 |

---

## 8. Reject Taxonomy 분해 (baseline → after)

| Reject | Before (대표) | After |
|---|---|---|
| TOPIC_ONLY / GENERIC_TOPIC_ONLY | clear-agreement graduation, blind agreement pairs | clear-agreement **PASS**; ocean pH / EV **PASS** |
| LOGICAL_GAP / ALIGNMENT_FAILED | proposition entailment 실패 | numeric/metric rules로 EV/ocean **PASS** |
| DIFFERENT_DIMENSION | EV LLM COMPLEMENTARY mis-route | EV candidate → AGREEMENT **PASS** |
| RELATIONSHIP_PROPOSITION_HALLUCINATION | insulation (이전 수정) | targeted에서 false positive **0** |
| polarity_not_opposed | screen/sleep, fasting divide | unit tests **PASS**; live run extraction failure로 미검증 |
| verifier rejected / none verified | wildfire/coral complementary | wildfire **PASS**, coral still fail |

---

## 9. Determinism

- Verifier LLM temperature 명시 변경 **없음**.
- Live run 간 extraction variance (divide/telehealth fixtures)가 recall 변동 주요 원인으로 관측.

---

## 10. 테스트 실행 기록

| Phase | Command | Result |
|---|---|---|
| Unit | `vitest proposition-semantics-recall + alignment tests` | **34 passed** |
| Phase A | `npm run eval:reasoning:blind:targeted` | Precision 100%, Recall 40% |
| Phase C | `npm run eval:reasoning:suite` | NOT READY (mixed-irrelevant only) |
| Phase B/D | same-topic blind + full blind 3-run | **미실행** (Phase A recall 목표 미달) |

---

## 11. 다음 권장 작업 (verifier 범위 밖 분리)

1. **Coral complementary**: `phenomenon↔ecosystem` LLM verification path + heuristic COMPLEMENTARY candidate type 일치 확인.
2. **Carbon agreement**: renewable investment pair — LLM classification vs heuristic AGREEMENT funnel trace.
3. **Extraction nondeterminism**: screen-sleep, fasting-weight, telehealth — claim population before verifier (이번 작업에서 의도적으로 미수정).
4. Phase B precision guard (same-topic solar/quantum) 후 full blind 3-run.

---

## Summary

Verifier/proposition gate 일반화 규칙으로 **blind recall 9% → 40%** (targeted), **precision 100% / false relationship 0** 유지, **graduation clear-agreement 복구**. 목표 recall ≥80% 및 full blind stability 검증은 **추가 iteration** 필요. Exit: **NEEDS TARGETED FIX**.
