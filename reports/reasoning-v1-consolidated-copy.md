================================================================================
elcanto Reasoning v1 — 통합 보고 (한 번에 복사용)
================================================================================
Generated: 2026-08-29
Engine: reasoning-v2.1
Commit: 70ea277ee9e98b45c1863600942a3f279c7cca3b
Pipeline: LIVE

이 파일은 Blind Test + Graduation Suite + 핵심 진단을 한 문서에 합친 것입니다.
상세 raw JSON은 별도 파일 참조.

================================================================================
1. 최종 상태 요약
================================================================================

Blind Test Exit:        REASONING V1 NOT STABLE
Graduation V1 Exit:     NOT READY

Blind Test (unseen 12 fixtures, 3 runs each):
  Precision:            100%  (TP=1, FP=0)
  Recall:               9%    (TP=1 / Gold=11)
  False Agreement:      0
  False Divide:         0
  False Complementary:  0
  Evidence Integrity:   PASS
  Judgment Grounding:   PASS
  Relationship Stability: FAIL
  Pipeline Stability:   PASS

Graduation Suite (5 fixtures, blind test 마지막에 재실행):
  Aggregate Precision:  60%
  Aggregate Recall:     60%
  Missed Gold:          2
  False Agreement:      0
  MCP Regression:       PASS

================================================================================
2. BLIND TEST DASHBOARD
================================================================================

Precision: 1
Recall: 0.09090909090909091

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
Relationship Drift: 1 fixtures
Judgment Drift: 1 fixtures

Aggregate:
  Gold relationships:     11
  Predicted relationships:  1
  True positive:            1
  False positive:           0
  False negative:           10

================================================================================
3. BLIND FIXTURE 결과 (12개)
================================================================================

Fixture                        | Category              | Evidence | Rel.Quality | Pipeline | Gold Stability (3-run)
-------------------------------|-----------------------|----------|-------------|----------|------------------------
blind-agreement-ocean-ph       | clear-agreement       | PASS     | FAIL        | PASS     | AGREEMENT 0/3 FAIL
blind-agreement-ev-range       | clear-agreement       | PASS     | FAIL        | PASS     | AGREEMENT 0/3 FAIL
blind-divide-screen-sleep      | clear-divide          | PASS     | FAIL        | PASS     | DIVIDE 0/3 FAIL
blind-divide-fasting-weight    | clear-divide          | PASS     | FAIL        | PASS     | DIVIDE 0/3 FAIL
blind-same-topic-solar         | same-topic            | PASS     | N/A         | PASS     | no gold, stable
blind-same-topic-quantum       | same-topic            | PASS     | N/A         | PASS     | no gold, stable
blind-complementary-wildfire   | complementary         | PASS     | FAIL        | PASS     | COMPLEMENTARY 0/3 FAIL
blind-complementary-coral      | complementary         | PASS     | FAIL        | PASS     | COMPLEMENTARY 0/3 FAIL
blind-mixed-water-filtration   | mixed-irrelevant      | PASS     | FAIL        | FAIL     | AGREEMENT 0/3 FAIL
blind-mixed-cycling            | mixed-irrelevant      | PASS     | N/A         | PASS     | no gold, stable
blind-complex-telehealth       | complex-natural       | PASS     | FAIL        | PASS     | AGREEMENT 3/3 STABLE; DIVIDE 0/3 FAIL
blind-complex-carbon-pricing   | complex-natural       | PASS     | FAIL        | PASS     | AGREEMENT 0/3 FAIL; DIVIDE 0/3 FAIL

================================================================================
4. BLIND FAILURE ATTRIBUTION (최초 실패 stage)
================================================================================

blind-agreement-ocean-ph       → RELATIONSHIP_VERIFICATION_FAILURE (HALLUCINATION)     3/3
blind-agreement-ev-range       → RELATIONSHIP_VERIFICATION_FAILURE (none verified)     3/3
blind-divide-screen-sleep      → RELATIONSHIP_VERIFICATION_FAILURE (none verified)     3/3
blind-divide-fasting-weight    → RELATIONSHIP_VERIFICATION_FAILURE (none verified)     3/3
blind-complementary-wildfire   → RELATIONSHIP_VERIFICATION_FAILURE (none verified)     3/3
blind-complementary-coral      → RELATIONSHIP_VERIFICATION_FAILURE (DIFFERENT_DIMENSION) 3/3
blind-mixed-water-filtration   → RELEVANCE_FAILURE (relevanceUsable=0)                 3/3
blind-complex-telehealth       → RELATIONSHIP_CLASSIFICATION_FAILURE (missedGold=1)    3/3
blind-complex-carbon-pricing   → RELATIONSHIP_VERIFICATION_FAILURE (none verified)     3/3

same-topic-solar / same-topic-quantum / mixed-cycling → NONE (false relationship 0)

================================================================================
5. BLIND MCP REPRODUCIBILITY (5 runs, 진단만)
================================================================================

Run  | Claims | Gen Eligible | Candidates | Verified | Agreement
-----|--------|--------------|------------|----------|----------
  1  |   22   |     22       |    35      |    1     |    1
  2  |   34   |     32       |    35      |    1     |    1
  3  |   31   |     31       |    35      |    1     |    1
  4  |   19   |     19       |    35      |    1     |    1
  5  |   28   |     28       |    35      |    0     |    0

claims range: 19–34
generationEligible range: 19–32
candidates range: 35–35 (stable)

원인 후보 (코드 수정 안 함):
- LLM extraction nondeterminism
- relevance/eligibility nondeterminism
- verifier nondeterminism (verified 0↔1)
- seed 미설정, temperature default

================================================================================
6. GRADUATION SUITE (5 fixtures)
================================================================================

Fixture                    | Evidence | Precision | Recall | Judgment   | Result
---------------------------|----------|-----------|--------|------------|--------
MCP Baseline               | PASS     | 100%      | 100%   | SUPPORTED  | PASS
Clear Agreement            | PASS     | 0%        | 0%     | N/A        | FAIL
Clear Divide               | PASS     | 100%      | 100%   | SUPPORTED  | PASS
Same Topic / Different     | PASS     | 100%      | 100%   | N/A        | PASS
Mixed / Irrelevant         | PASS     | 0%        | 0%     | N/A        | FAIL

Overall: Precision 60%, Recall 60%, Missed Gold 2, False Agreement/Divide/Complementary 0

V1 EXIT STATUS: NOT READY

BLOCKERS:
- clear-agreement: MISSED_GOLD_RELATIONSHIP (PRE_LLM TOPIC_ONLY reject)
- mixed-irrelevant: MISSED_GOLD_RELATIONSHIP (PRE_LLM LOGICAL_GAP reject)

Unit Regression: 전체 PASS
Precision Regression Guard (same-topic): PASS

================================================================================
7. 핵심 진단 (한 줄)
================================================================================

Graduation fixture:     calibration domain에서 대부분 PASS 가능 (run-to-run 변동 있음)
Blind unseen domain:    verification/proposition gate가 대량 reject → recall 9%
Stability:              pipeline collapse 없음; gold identity 기준 stability는 대부분 0/3 FAIL
복잡 fixture 예외:      telehealth AGREEMENT만 3/3 STABLE, DIVIDE는 0/3 FAIL

Reasoning engine 코드는 blind test 과정에서 수정하지 않음.
Evaluator만 relationship stability 계산을 gold identity 기준으로 수정함.

================================================================================
8. 수정 후보 (적용 안 함)
================================================================================

RELATIONSHIP_VERIFICATION_FAILURE
  → unseen domain에 minimum shared proposition / dimension rule 부재
  → regression risk: clear-divide, mixed-irrelevant gate

RELEVANCE_FAILURE
  → mixed fixture relevance threshold / extraction claim count
  → regression risk: off-topic source 유입

STABILITY_FAILURE (MCP)
  → LLM extraction + verifier nondeterminism
  → regression risk: 전 fixture relationship 결과

================================================================================
9. 확인할 파일 경로
================================================================================

[한 번에 복사] 이 파일:
  reports/reasoning-v1-consolidated-copy.md

[Blind Test]
  reports/reasoning-v1-blind-test.md          ← 요약 대시보드
  reports/reasoning-v1-blind-test-raw.json    ← 12×3 runs 전체

[Graduation Suite]
  reports/reasoning-suite-report.md
  reports/reasoning-suite-raw.json
  reports/benchmark/<fixtureId>-raw.json      ← fixture LIVE 상세

[Baseline / Gold]
  tests/reasoning/blind/baseline-freeze.json
  tests/reasoning/blind/gold/*.json
  tests/reasoning/blind/fixtures/*.json
  lib/reasoning/eval/benchmark-gold.ts

[Stability evaluator (이번 수정)]
  lib/reasoning/eval/blind-assessment.ts
  lib/reasoning/eval/__tests__/blind-assessment.test.ts

[Blind fixture 데이터]
  lib/reasoning/eval/blind-data/*.ts

[Reasoning engine (원인 추적, 수정 안 함)]
  lib/reasoning/llm-steps.ts
  lib/reasoning/proposition-alignment.ts

[실행 명령]
  npm run eval:reasoning:blind
  npm run eval:reasoning:suite
  npm run eval:reasoning -- --fixture=<fixtureId>

================================================================================
END
================================================================================
