# elcanto Reasoning v1 Blind Test Report

Generated At: 2026-08-29T17:24:34.669Z
Engine: reasoning-v2.2
Commit: 70ea277ee9e98b45c1863600942a3f279c7cca3b
Baseline Commit: 70ea277ee9e98b45c1863600942a3f279c7cca3b

```text
BLIND TEST

Precision: 1
Recall: 0.18181818181818182

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
Relationship Drift: 0 fixtures
Judgment Drift: 2 fixtures
```

## Exit Status

**NEEDS TARGETED FIX**

## Aggregate Metrics

| Metric | Value |
|---|---|
| Gold relationships | 11 |
| Predicted relationships | 2 |
| True positive | 2 |
| False positive | 0 |
| False negative | 9 |
| Precision | 1 (100%) |
| Recall | 0.18181818181818182 (18%) |

## Fixture Results

| Fixture | Category | Evidence | Relationship | Pipeline | Stability | Attribution |
|---|---|---|---|---|---|---|
| blind-agreement-ocean-ph | clear-agreement | PASS | FAIL | FAIL | source_1|source_2:AGREEMENT:declined by approximately 0.1 units↔measurable drop in average pH: 0/3 = FAIL | RELEVANCE_FAILURE |
| blind-agreement-ev-range | clear-agreement | PASS | FAIL | FAIL | source_1|source_2:AGREEMENT:250 and 300 miles↔400 to 480 kilometers: 0/3 = FAIL | RELEVANCE_FAILURE |
| blind-divide-screen-sleep | clear-divide | PASS | PASS | PASS | source_1|source_2:DIVIDE:shortens total sleep duration↔no measurable impact on adolescent sleep: 3/3 = STABLE | NONE |
| blind-divide-fasting-weight | clear-divide | PASS | FAIL | FAIL | source_1|source_2:DIVIDE:greater fat loss↔no significant advantage: 0/3 = FAIL | RELEVANCE_FAILURE |
| blind-same-topic-solar | same-topic-different-claims | PASS | N/A | PASS | 3/3 = STABLE (no gold required) | NONE |
| blind-same-topic-quantum | same-topic-different-claims | PASS | N/A | PASS | 3/3 = STABLE (no gold required) | NONE |
| blind-complementary-wildfire | complementary | PASS | FAIL | FAIL | source_1|source_2:COMPLEMENTARY:respiratory inflammation↔cardiovascular emergency admissions: 0/3 = FAIL | RELEVANCE_FAILURE |
| blind-complementary-coral | complementary | PASS | FAIL | FAIL | source_1|source_2:COMPLEMENTARY:expel symbiotic algae↔lose structural complexity: 0/3 = FAIL | RELEVANCE_FAILURE |
| blind-mixed-water-filtration | mixed-irrelevant | PASS | FAIL | FAIL | source_1|source_2:AGREEMENT:remove 95%+ dissolved contaminants↔similar contaminant reduction: 0/3 = FAIL | RELEVANCE_FAILURE |
| blind-mixed-cycling | mixed-irrelevant | PASS | N/A | PASS | 3/3 = STABLE (no gold required) | NONE |
| blind-complex-telehealth | complex-natural | PASS | FAIL | PASS | source_1|source_2:AGREEMENT:expanded access to specialist consultations for rural↔gained specialist access through expanded telehealth: 3/3 = STABLE; source_1|source_2:DIVIDE:reduce hospital readmission rates↔readmissions for heart failure patients rose: 0/3 = FAIL | RELATIONSHIP_CLASSIFICATION_FAILURE |
| blind-complex-carbon-pricing | complex-natural | PASS | FAIL | FAIL | source_1|source_2:AGREEMENT:accelerate renewable energy investment↔drive utility-scale clean energy capital: 0/3 = FAIL; source_1|source_2:DIVIDE:Coal plant retirements in the EU declined 15% faster↔coal capacity shutdowns slowed: 0/3 = FAIL | RELEVANCE_FAILURE |

## Fixture Funnel (last run per fixture)

### blind-agreement-ocean-ph

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-agreement-ev-range

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-divide-screen-sleep

| Stage | Count |
|---|---:|
| extractedClaims | 2 |
| evidenceSupportedClaims | 2 |
| relevanceUsable | 2 |
| generationEligible | 2 |
| candidatePairs | 1 |
| verifiedRelationships | 1 |
| agreement | 0 |
| divide | 1 |
| complementary | 0 |
| judgment confidence | moderate |

Stability flags: JUDGMENT_DRIFT

Gold relationship stability:
- DIVIDE source_1↔source_2: 3/3 = STABLE

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: FAIL

### blind-divide-fasting-weight

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- DIVIDE source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-same-topic-solar

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-same-topic-quantum

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-complementary-wildfire

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- COMPLEMENTARY source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-complementary-coral

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- COMPLEMENTARY source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-mixed-water-filtration

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-mixed-cycling

| Stage | Count |
|---|---:|
| extractedClaims | 1 |
| evidenceSupportedClaims | 1 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-complex-telehealth

| Stage | Count |
|---|---:|
| extractedClaims | 3 |
| evidenceSupportedClaims | 3 |
| relevanceUsable | 3 |
| generationEligible | 3 |
| candidatePairs | 2 |
| verifiedRelationships | 1 |
| agreement | 1 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | moderate |

Stability flags: JUDGMENT_DRIFT

Gold relationship stability:
- AGREEMENT source_1↔source_2: 3/3 = STABLE
- DIVIDE source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: FAIL

### blind-complex-carbon-pricing

| Stage | Count |
|---|---:|
| extractedClaims | 2 |
| evidenceSupportedClaims | 2 |
| relevanceUsable | 0 |
| generationEligible | 0 |
| candidatePairs | 0 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 0/3 = FAIL
- DIVIDE source_1↔source_2: 0/3 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

## MCP Reproducibility (5 runs)

| Run | Claims | Gen Eligible | Candidates | Verified | Agreement |
|---:|---:|---:|---:|---:|---:|
| mcp-run-1 | 0 | 0 | 0 | 0 | 0 |
| mcp-run-2 | 0 | 0 | 0 | 0 | 0 |
| mcp-run-3 | 0 | 0 | 0 | 0 | 0 |
| mcp-run-4 | 0 | 0 | 0 | 0 | 0 |
| mcp-run-5 | 0 | 0 | 0 | 0 | 0 |

Diagnosis (no code changes applied):
- claims range: 0–0 (LLM extraction nondeterminism candidate)
- generationEligible range: 0–0 (relevance/eligibility nondeterminism candidate)
- candidates range: 0–0 (candidate discovery instability candidate)
- Fixture loading uses same synthesis job — fixture loading discrepancy unlikely unless refresh flags differ.
- Model/temperature/seed: OPENAI_MODEL and OPENAI_TEMPERATURE env defaults apply; no seed set.

## Graduation Suite Regression

| Graduation PASS | false |
| V1 Exit Status | NOT READY |
| Commit matches baseline | true |

## Failure Attribution

- **blind-agreement-ocean-ph** — RELEVANCE_FAILURE: relevanceUsable=0 (3/3 runs affected)
- **blind-agreement-ev-range** — RELEVANCE_FAILURE: relevanceUsable=0 (3/3 runs affected)
- **blind-divide-fasting-weight** — RELEVANCE_FAILURE: relevanceUsable=0 (3/3 runs affected)
- **blind-complementary-wildfire** — RELEVANCE_FAILURE: relevanceUsable=0 (3/3 runs affected)
- **blind-complementary-coral** — RELEVANCE_FAILURE: relevanceUsable=0 (3/3 runs affected)
- **blind-mixed-water-filtration** — RELEVANCE_FAILURE: relevanceUsable=0 (3/3 runs affected)
- **blind-complex-telehealth** — RELATIONSHIP_CLASSIFICATION_FAILURE: missedGold=1 (3/3 runs affected)
- **blind-complex-carbon-pricing** — RELEVANCE_FAILURE: relevanceUsable=0 (3/3 runs affected)

## Remediation Candidates (not applied in this task)

### RELEVANCE_FAILURE
- Hypothesis: Relevance scoring nondeterministic or threshold-sensitive on borderline sources.
- Regression risk: Threshold tuning may admit off-topic sources in mixed fixtures.

### RELATIONSHIP_VERIFICATION_FAILURE
- Hypothesis: Verifier or proposition gate rejects valid unseen paraphrases or misclassifies opposition.
- Regression risk: Verifier prompt changes affect clear-divide and mixed-irrelevant gates.

---
Raw: `reports/reasoning-v1-blind-test-raw.json`