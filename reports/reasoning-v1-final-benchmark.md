# elcanto Reasoning v1 — Final Benchmark (FROZEN)

**Frozen at:** 2026-08-29T14:55:42Z  
**Engine:** `reasoning-v2.1`  
**Commit:** `70ea277ee9e98b45c1863600942a3f279c7cca3b`  
**Status:** **FROZEN** — 추가 reasoning 수정 없음. Exit `REASONING V1 NOT STABLE`이지만 V1 벤치라인으로 고정.

Raw artifacts:
- Blind: `reports/reasoning-v1-blind-test.md`, `reports/reasoning-v1-blind-test-raw.json`
- Graduation: `reports/reasoning-suite-report.md`, `reports/reasoning-suite-raw.json`
- Recall recovery notes: `reports/reasoning-v1-recall-recovery-report.md`

---

## V1 Final Benchmark

### Phase B — Same-Topic Precision Regression (2026-08-29, pre-freeze)

| Fixture | Agreement | Divide | Complementary | False Agreement | False Divide | False Complementary | Result |
|---|---:|---:|---:|---:|---:|---:|---|
| blind-same-topic-solar | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |
| blind-same-topic-quantum | 0 | 0 | 0 | 0 | 0 | 0 | **PASS** |

Precision guard on unseen same-topic fixtures: **유지** (false relationship 0).

### Full Blind Suite (2026-08-29, 1 stability run × 12 fixtures)

> Note: 이번 실행 raw JSON에 `runIndex: 1`만 기록됨 (3-run 아님). Stability 열은 `N/1`.

```text
BLIND TEST (final freeze run)

Precision:           100%  (TP=3, FP=0)
Recall:              27%   (TP=3 / Gold=11)
False Agreement:     0
False Divide:        0
False Complementary: 0
Evidence Integrity:    FAIL (fixture-level; see limitations)
Judgment Grounding:    PASS
Relationship Stability: FAIL
Pipeline Stability:    PASS
Exit:                  REASONING V1 NOT STABLE
```

| Metric | Baseline blind (pre-recovery) | Final freeze |
|---|---|---|
| Precision | 100% | **100%** |
| Recall | 9% (1/11) | **27% (3/11)** |
| False Agreement | 0 | **0** |
| False Divide | 0 | **0** |
| False Complementary | 0 | **0** |

### Gold Relationship Detection

```text
Gold Relationship                  Before    After (freeze run)
--------------------------------------------------
Agreement ocean pH                 0/3       0/1 FAIL
Agreement EV range                 0/3       1/1 STABLE
Divide screen/sleep                0/3       0/1 FAIL (EXTRACTION)
Divide fasting/weight              0/3       0/1 FAIL (EXTRACTION)
Complementary wildfire             0/3       1/1 STABLE
Complementary coral                0/3       0/1 FAIL
Mixed filtration Agreement         0/3       0/1 FAIL (RELEVANCE)
Telehealth Agreement               3/3       0/1 FAIL (EXTRACTION)
Telehealth Divide                  0/3       0/1 FAIL (EXTRACTION)
Carbon pricing Agreement           0/3       0/1 FAIL
Carbon pricing Divide              0/3       1/1 STABLE
```

**Detected gold (3/11):** EV range AGREEMENT, wildfire COMPLEMENTARY, carbon pricing DIVIDE.

### Graduation Suite (last run before freeze)

| Fixture | Result | Precision | Recall |
|---|---|---:|---:|
| MCP Baseline | PASS | 100% | 100% |
| Clear Agreement | PASS | 100% | 100% |
| Clear Divide | PASS | 100% | 100% |
| Same Topic / Different Claims | PASS | 100% | 100% |
| Mixed / Irrelevant | FAIL | 0% | 0% |

| Aggregate | Value |
|---|---|
| Overall precision | 80% |
| Overall recall | 80% |
| False Agreement / Divide / Complementary | 0 / 0 / 0 |
| Missed gold | 1 (mixed-irrelevant) |
| MCP regression | PASS |

### Blind fixture summary (12)

| Fixture | Rel. Quality | Gold stability | Attribution |
|---|---|---|---|
| blind-agreement-ocean-ph | FAIL | AGREEMENT 0/1 | VERIFICATION |
| blind-agreement-ev-range | PASS | AGREEMENT 1/1 | — |
| blind-divide-screen-sleep | FAIL | DIVIDE 0/1 | EXTRACTION |
| blind-divide-fasting-weight | FAIL | DIVIDE 0/1 | EXTRACTION |
| blind-same-topic-solar | N/A | stable | — |
| blind-same-topic-quantum | N/A | stable (pipeline FAIL) | EXTRACTION |
| blind-complementary-wildfire | PASS | COMPLEMENTARY 1/1 | — |
| blind-complementary-coral | FAIL | COMPLEMENTARY 0/1 | VERIFICATION |
| blind-mixed-water-filtration | FAIL | AGREEMENT 0/1 | RELEVANCE |
| blind-mixed-cycling | N/A | stable | — |
| blind-complex-telehealth | FAIL | AGR 0/1, DIV 0/1 | EXTRACTION |
| blind-complex-carbon-pricing | FAIL | AGR 0/1, DIV 1/1 | CLASSIFICATION |

---

## Known Limitations

1. **Recall below target** — Blind recall 27% vs 목표 80%+. Gold 8건 미검출.
2. **Extraction nondeterminism** — screen-sleep, fasting-weight, telehealth, same-topic-quantum 등에서 `extractedClaims=0` / pipeline collapse 간헐 발생.
3. **Relevance gate** — mixed-water-filtration: 한 source만 relevance 통과 → gold pair unreachable (`RELEVANCE_FAILURE`).
4. **Verifier variance** — ocean-ph, coral complementary: candidate 존재하지만 verification 실패 간헐.
5. **Classification noise** — carbon-pricing: divide 검출되지만 agreement missed; telehealth TRADE_OFF 등 cross-claim noise 가능.
6. **Stability run count** — 최종 blind raw에 1-run만 기록; 3-run stability 미재실행.
7. **MCP reproducibility** — blind 마지막 MCP 5-run: claims/verified 0–0 (nondeterminism).
8. **Mixed-irrelevant graduation** — graduation FAIL (MISSED_GOLD); blind mixed-water와 동일 relevance 계열.
9. **Evidence integrity** — blind aggregate `Evidence Integrity: FAIL` (fixture-level extraction/relevance 연쇄).
10. **Precision guard 의존** — same-topic·graduation에서 false relationship 0 유지; recall 확장 시 regression 위험 잔존.

---

## V2 Backlog

### P0 — Pipeline reliability

- [ ] Claim extraction determinism / retry policy (multi-claim fixtures, telehealth, divide pairs)
- [ ] Extraction failure → graceful degradation (partial claims, diagnostic surfacing)
- [ ] Blind harness: enforce `STABILITY_RUNS=3` and report `N/3` consistently

### P1 — Recall (verifier + discovery)

- [ ] Ocean pH agreement: proposition gate + LLM verification trace closure
- [ ] Coral complementary: mechanism↔ecosystem COMPLEMENTARY candidate type + post-gate
- [ ] Carbon pricing agreement: renewable investment pair classification
- [ ] Divide pairs (screen/sleep, fasting/weight): extraction 이후 null-effect opposition end-to-end
- [ ] Telehealth: per-claim relationship (rural access AGREEMENT + readmission DIVIDE 동시)

### P2 — Relevance (별도 트랙)

- [ ] Mixed-water-filtration: source-level relevance without global threshold 하향
- [ ] Graduation mixed-irrelevant gold recovery
- [ ] Relevance nondeterminism audit (temperature, model, borderline scoring)

### P3 — Stability & ops

- [ ] MCP 5-run reproducibility band (claims, candidates, verified)
- [ ] Relationship stability: gold identity `N/3` gate for production readiness
- [ ] Temperature/seed policy for verification vs extraction
- [ ] Blind + graduation CI matrix on freeze commit

### P4 — Precision guard regression suite

- [ ] Automated Phase B (same-topic solar/quantum) on every reasoning change
- [ ] Forbidden-relationship audit expansion (solar efficiency↔capacity, quantum funding↔hardware)
- [ ] False TRADE_OFF / cross-dimension agreement suppression

### Explicitly out of V1 scope (unchanged in V2 planning)

- UI, schema, DB, API surface
- Global relevance threshold 단순 하향
- Fixture-specific keyword rules

---

## Freeze declaration

Reasoning **v1** logic at commit `70ea277ee9e98b45c1863600942a3f279c7cca3b` is **frozen**.

- No further changes to pass benchmarks.
- V2 work branches from this commit baseline.
- Production use: precision guard 강점 활용; blind recall·extraction stability 한계 인지 필요.
