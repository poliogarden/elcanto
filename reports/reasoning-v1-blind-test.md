# elcanto Reasoning v1 Blind Test Report

Generated At: 2026-08-29T15:39:45.515Z
Engine: reasoning-v2.1
Commit: 70ea277ee9e98b45c1863600942a3f279c7cca3b
Baseline Commit: 70ea277ee9e98b45c1863600942a3f279c7cca3b

```text
BLIND TEST

Precision: 1
Recall: 0.7

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
Judgment Drift: 0 fixtures
```

## Exit Status

**REASONING V1 NOT STABLE**

## Aggregate Metrics

| Metric | Value |
|---|---|
| Gold relationships | 10 |
| Predicted relationships | 7 |
| True positive | 7 |
| False positive | 0 |
| False negative | 3 |
| Precision | 1 (100%) |
| Recall | 0.7 (70%) |

## Fixture Results

| Fixture | Category | Evidence | Relationship | Pipeline | Stability | Attribution |
|---|---|---|---|---|---|---|
| blind-agreement-ocean-ph | clear-agreement | PASS | FAIL | PASS | source_1|source_2:AGREEMENT:declined by approximately 0.1 units↔measurable drop in average pH: 0/1 = FAIL | RELATIONSHIP_VERIFICATION_FAILURE |
| blind-agreement-ev-range | clear-agreement | PASS | FAIL | PASS | source_1|source_2:AGREEMENT:250 and 300 miles↔400 to 480 kilometers: 0/1 = FAIL | RELATIONSHIP_VERIFICATION_FAILURE |
| blind-divide-screen-sleep | clear-divide | PASS | PASS | PASS | source_1|source_2:DIVIDE:shortens total sleep duration↔no measurable impact on adolescent sleep: 1/1 = STABLE | NONE |
| blind-divide-fasting-weight | clear-divide | PASS | PASS | PASS | source_1|source_2:DIVIDE:greater fat loss↔no significant advantage: 1/1 = STABLE | NONE |
| blind-complementary-wildfire | complementary | PASS | PASS | PASS | source_1|source_2:COMPLEMENTARY:respiratory inflammation↔cardiovascular emergency admissions: 1/1 = STABLE | NONE |
| blind-complementary-coral | complementary | PASS | PASS | PASS | source_1|source_2:COMPLEMENTARY:expel symbiotic algae↔lose structural complexity: 1/1 = STABLE | NONE |
| blind-complex-telehealth | complex-natural | PASS | PASS | PASS | source_1|source_2:AGREEMENT:expanded access to specialist consultations for rural↔gained specialist access through expanded telehealth: 1/1 = STABLE; source_1|source_2:DIVIDE:reduce hospital readmission rates↔readmissions for heart failure patients rose: 1/1 = STABLE | NONE |
| blind-complex-carbon-pricing | complex-natural | PASS | FAIL | PASS | source_1|source_2:AGREEMENT:accelerate renewable energy investment↔drive utility-scale clean energy capital: 0/1 = FAIL; source_1|source_2:DIVIDE:Coal plant retirements in the EU declined 15% faster↔coal capacity shutdowns slowed: 1/1 = STABLE | RELATIONSHIP_CLASSIFICATION_FAILURE |

## Fixture Funnel (last run per fixture)

### blind-agreement-ocean-ph

| Stage | Count |
|---|---:|
| extractedClaims | 2 |
| evidenceSupportedClaims | 2 |
| relevanceUsable | 2 |
| generationEligible | 2 |
| candidatePairs | 1 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 0/1 = FAIL

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-agreement-ev-range

| Stage | Count |
|---|---:|
| extractedClaims | 2 |
| evidenceSupportedClaims | 2 |
| relevanceUsable | 2 |
| generationEligible | 2 |
| candidatePairs | 1 |
| verifiedRelationships | 0 |
| agreement | 0 |
| divide | 0 |
| complementary | 0 |
| judgment confidence | N/A |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 0/1 = FAIL

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

Gold relationship stability:
- DIVIDE source_1↔source_2: 1/1 = STABLE

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-divide-fasting-weight

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

Gold relationship stability:
- DIVIDE source_1↔source_2: 1/1 = STABLE

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-complementary-wildfire

| Stage | Count |
|---|---:|
| extractedClaims | 2 |
| evidenceSupportedClaims | 2 |
| relevanceUsable | 2 |
| generationEligible | 2 |
| candidatePairs | 1 |
| verifiedRelationships | 1 |
| agreement | 0 |
| divide | 0 |
| complementary | 1 |
| judgment confidence | moderate |

Gold relationship stability:
- COMPLEMENTARY source_1↔source_2: 1/1 = STABLE

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-complementary-coral

| Stage | Count |
|---|---:|
| extractedClaims | 2 |
| evidenceSupportedClaims | 2 |
| relevanceUsable | 2 |
| generationEligible | 2 |
| candidatePairs | 1 |
| verifiedRelationships | 1 |
| agreement | 0 |
| divide | 0 |
| complementary | 1 |
| judgment confidence | moderate |

Gold relationship stability:
- COMPLEMENTARY source_1↔source_2: 1/1 = STABLE

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-complex-telehealth

| Stage | Count |
|---|---:|
| extractedClaims | 5 |
| evidenceSupportedClaims | 5 |
| relevanceUsable | 5 |
| generationEligible | 5 |
| candidatePairs | 6 |
| verifiedRelationships | 2 |
| agreement | 1 |
| divide | 1 |
| complementary | 0 |
| judgment confidence | moderate |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 1/1 = STABLE
- DIVIDE source_1↔source_2: 1/1 = STABLE

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

### blind-complex-carbon-pricing

| Stage | Count |
|---|---:|
| extractedClaims | 3 |
| evidenceSupportedClaims | 3 |
| relevanceUsable | 3 |
| generationEligible | 3 |
| candidatePairs | 2 |
| verifiedRelationships | 1 |
| agreement | 0 |
| divide | 1 |
| complementary | 0 |
| judgment confidence | moderate |

Gold relationship stability:
- AGREEMENT source_1↔source_2: 0/1 = FAIL
- DIVIDE source_1↔source_2: 1/1 = STABLE

3-run variance:
- claim count variance: 0
- generation eligible variance: 0
- candidate variance: 0
- judgment consistency: STABLE

## MCP Reproducibility (5 runs)

| Run | Claims | Gen Eligible | Candidates | Verified | Agreement |
|---:|---:|---:|---:|---:|---:|

Diagnosis (no code changes applied):

## Graduation Suite Regression

| Graduation PASS | false |
| V1 Exit Status | NOT RUN |
| Commit matches baseline | true |

## Failure Attribution

- **blind-agreement-ocean-ph** — RELATIONSHIP_VERIFICATION_FAILURE: Candidates existed but none verified. (1/1 runs affected)
- **blind-agreement-ev-range** — RELATIONSHIP_VERIFICATION_FAILURE: Candidates existed but none verified. (1/1 runs affected)
- **blind-complex-carbon-pricing** — RELATIONSHIP_CLASSIFICATION_FAILURE: missedGold=1 (1/1 runs affected)

## Remediation Candidates (not applied in this task)

### RELATIONSHIP_VERIFICATION_FAILURE
- Hypothesis: Verifier or proposition gate rejects valid unseen paraphrases or misclassifies opposition.
- Regression risk: Verifier prompt changes affect clear-divide and mixed-irrelevant gates.

---
Raw: `reports/reasoning-v1-blind-test-raw.json`