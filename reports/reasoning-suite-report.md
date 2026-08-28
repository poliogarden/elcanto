# elcanto Reasoning v1 Graduation Report

Generated At: 2026-08-28T06:22:10.453Z
Commit: 85693ad0ab725dd263ecb003efe0f4f48f4299f5
Engine: reasoning-v2.1
Pipeline Mode: LIVE

## Summary

| Fixture | Evidence | Precision | Recall | Judgment | Result |
|---|---|---:|---:|---|---|
| MCP Baseline | PASS | 100% | 100% | SUPPORTED | PASS |
| Clear Agreement | PASS | 100% | 100% | SUPPORTED | PASS |
| Clear Divide | PASS | 100% | 100% | SUPPORTED | PASS |
| Same Topic / Different Claims | PASS | 100% | 100% | N/A | PASS |
| Mixed / Irrelevant | PASS | 0% | 0% | N/A | FAIL |

## Overall Relationship Quality

Precision: 80%
Recall: 80%

False Agreement: 0
False Divide: 0
False Complementary: 0

Missed Gold Relationships: 1

## Judgment Safety

Supported: 11
Unsupported: 0
False relationships used by Judgment: 0

## Regression

MCP regression: PASS
Evidence regression: PASS
Relationship regression: PASS
Judgment regression: PASS

## Fixture Details

### MCP Baseline (mcp-3video-baseline)

Result: **PASS**

| Metric | Value |
|---|---:|
| Total extracted claims | 31 |
| Evidence-supported claims | 31 |
| Relevance usable | 43 |
| Generation eligible | 29 |
| Candidates | 35 |
| Verified | 1 |
| Agreement | 1 |
| Divide | 0 |
| Complementary | 0 |
| Agreement precision | 100% |
| Divide precision | 100% |
| Complementary precision | 100% |
| False Agreement | 0 |
| False Divide | 0 |
| False Complementary | 0 |
| Missed expected relationships | 0 |
| Final judgment | While both claims highlight the importance of MCP in the technology landscape, one focuses on recent attention while the other discusses its historical significance. |
| Supported propositions | 3 |
| Unsupported propositions | 0 |
| Judgment confidence | low |
| Judgment lineage | PASS |
| Reasoning quality (E2E) | PASS |

Participating sources: source_1, source_2, source_3

### Clear Agreement (clear-agreement)

Result: **PASS**

| Metric | Value |
|---|---:|
| Total extracted claims | 2 |
| Evidence-supported claims | 2 |
| Relevance usable | 2 |
| Generation eligible | 2 |
| Candidates | 1 |
| Verified | 1 |
| Agreement | 1 |
| Divide | 0 |
| Complementary | 0 |
| Agreement precision | 100% |
| Divide precision | 100% |
| Complementary precision | 100% |
| False Agreement | 0 |
| False Divide | 0 |
| False Complementary | 0 |
| Missed expected relationships | 0 |
| Final judgment | Remote work significantly reduces daily commuting time for employees, based on robust evidence from two sources. |
| Supported propositions | 4 |
| Unsupported propositions | 0 |
| Judgment confidence | moderate |
| Judgment lineage | PASS |
| Reasoning quality (E2E) | PASS |

Participating sources: source_1, source_2

Excluded / non-generating sources:
- source_3: NOT_IN_GENERATION

### Clear Divide (clear-divide)

Result: **PASS**

| Metric | Value |
|---|---:|
| Total extracted claims | 2 |
| Evidence-supported claims | 2 |
| Relevance usable | 2 |
| Generation eligible | 2 |
| Candidates | 1 |
| Verified | 1 |
| Agreement | 0 |
| Divide | 1 |
| Complementary | 0 |
| Agreement precision | 100% |
| Divide precision | 100% |
| Complementary precision | 100% |
| False Agreement | 0 |
| False Divide | 0 |
| False Complementary | 0 |
| Missed expected relationships | 0 |
| Final judgment | The evidence strongly supports divergent impacts of remote work on employee productivity, though it does not provide a definitive answer; more research is needed to clarify these conflicting perspectives. |
| Supported propositions | 4 |
| Unsupported propositions | 0 |
| Judgment confidence | moderate |
| Judgment lineage | PASS |
| Reasoning quality (E2E) | DEGRADED |

Participating sources: source_1, source_2

Excluded / non-generating sources:
- source_3: NOT_IN_GENERATION

### Same Topic / Different Claims (same-topic-different-claims)

Result: **PASS**

Pipeline diagnosis:
- No verified relationships; sample rejection: COMPLEMENTARY source_1↔source_2 → DIFFERENT_DIMENSION.

| Metric | Value |
|---|---:|
| Total extracted claims | 3 |
| Evidence-supported claims | 3 |
| Relevance usable | 3 |
| Generation eligible | 3 |
| Candidates | 3 |
| Verified | 0 |
| Agreement | 0 |
| Divide | 0 |
| Complementary | 0 |
| Agreement precision | 100% |
| Divide precision | 100% |
| Complementary precision | 100% |
| False Agreement | 0 |
| False Divide | 0 |
| False Complementary | 0 |
| Missed expected relationships | 0 |
| Final judgment | N/A |
| Supported propositions | 0 |
| Unsupported propositions | 0 |
| Judgment confidence | N/A |
| Judgment lineage | NONE |
| Reasoning quality (E2E) | DEGRADED |

Participating sources: source_1, source_2, source_3

### Mixed / Irrelevant (mixed-irrelevant)

Result: **FAIL**

Failure reasons:
- MISSED_GOLD_RELATIONSHIP (missed=1, recall=0)

Blockers:
- MISSED_GOLD_RELATIONSHIP

Pipeline diagnosis:
- Gold pair source_1↔source_2: candidate reached POST_LLM → REJECT (RELATIONSHIP_PROPOSITION_HALLUCINATION). Composite alignment score below required threshold.

| Metric | Value |
|---|---:|
| Total extracted claims | 2 |
| Evidence-supported claims | 2 |
| Relevance usable | 2 |
| Generation eligible | 2 |
| Candidates | 1 |
| Verified | 0 |
| Agreement | 0 |
| Divide | 0 |
| Complementary | 0 |
| Agreement precision | 100% |
| Divide precision | 100% |
| Complementary precision | 100% |
| False Agreement | 0 |
| False Divide | 0 |
| False Complementary | 0 |
| Missed expected relationships | 1 |
| Final judgment | N/A |
| Supported propositions | 0 |
| Unsupported propositions | 0 |
| Judgment confidence | N/A |
| Judgment lineage | NONE |
| Reasoning quality (E2E) | DEGRADED |

Participating sources: source_1, source_2

Excluded / non-generating sources:
- source_3: NOT_IN_GENERATION
- source_4: NOT_IN_GENERATION
- source_5: NOT_IN_GENERATION

## Standalone vs Suite Reproducibility

Standalone before: claims=30 genEligible=30 candidates=35 verified=1 agreement=1 divide=0 judgment=low evidence=PASS model=gpt-4o-mini (default) temp=default seed=none
Suite MCP: claims=31 genEligible=29 candidates=35 verified=1 agreement=1 divide=0 judgment=low evidence=PASS model=gpt-4o-mini (default) temp=default seed=none
Standalone after: claims=20 genEligible=20 candidates=35 verified=0 agreement=0 divide=0 judgment=N/A evidence=PASS model=gpt-4o-mini (default) temp=default seed=none

Before vs Suite diffs:
- claims: 30 → 31
- generationEligible: 30 → 29
- relevanceUsable: 40 → 43
- finalJudgment changed

Before vs After diffs:
- claims: 30 → 20
- generationEligible: 30 → 20
- verified: 1 → 0
- agreement: 1 → 0
- judgmentConfidence: low → N/A
- relevanceUsable: 40 → 24
- finalJudgment changed

Suite vs After diffs:
- claims: 31 → 20
- generationEligible: 29 → 20
- verified: 1 → 0
- agreement: 1 → 0
- judgmentConfidence: low → N/A
- relevanceUsable: 43 → 24
- finalJudgment changed

## Metric Population Audit

| Fixture | Extracted | Evidence-supported | Relevance usable | Gen eligible | Candidates | Verified | Invariant |
|---|---:|---:|---:|---:|---:|---:|---|
| MCP Baseline | 31 | 31 | 43 | 29 | 35 | 1 | PASS |
| Clear Agreement | 2 | 2 | 2 | 2 | 1 | 1 | PASS |
| Clear Divide | 2 | 2 | 2 | 2 | 1 | 1 | PASS |
| Same Topic / Different Claims | 3 | 3 | 3 | 3 | 3 | 0 | PASS |
| Mixed / Irrelevant | 2 | 2 | 2 | 2 | 1 | 0 | PASS |

## Gold Recall Trace

### clear-agreement: source_1 ↔ source_2

- dimension A/B: EFFECT / EFFECT
- dimensionCompatibility: EXACT
- propositionTarget A/B: commuting to a central workplace each d / travel that employees otherwise make
- polarity A/B: POSITIVE_REDUCTION / POSITIVE_REDUCTION
- sharedProposition: remote work reduces employee commuting or daily workplace travel
- entailedByA: true, entailedByB: true, addedInference: false
- PRE_LLM: PLAUSIBLY_COMPARABLE

### clear-divide: source_1 ↔ source_2

- dimension A/B: EFFECT / EFFECT
- dimensionCompatibility: EXACT
- propositionTarget A/B: productivity by limiting office distractio / productivity because home environments int
- polarity A/B: POSITIVE / NEGATIVE
- sharedProposition: The topic remote work employee
- entailedByA: false, entailedByB: false, addedInference: false
- PRE_LLM: PLAUSIBLY_COMPARABLE

### mixed-irrelevant: source_1 ↔ source_2

- dimension A/B: EFFECT / EFFECT
- dimensionCompatibility: EXACT
- propositionTarget A/B: insulation with an R-value of at least R / R-49 to R-60 insulation levels to
- polarity A/B: NEUTRAL / NEUTRAL
- sharedProposition: cold-climate attic retrofits target high R-value insulation
- entailedByA: false, entailedByB: false, addedInference: true
- PRE_LLM: PLAUSIBLY_COMPARABLE

## Precision Regression Guard

Result: **PASS**
Same Topic Different Claims: PASS
False Agreement: 0
False Divide: 0
False Complementary: 0

## Unit Regression

| Case | Result |
|---|---|
| MCP comparable pool | PASS |
| MCP candidate generation | PASS |
| MCP evidence grounding | PASS |
| Duplicate agreement | PASS |
| Genuine divide | PASS |
| Different dimension | PASS |
| Unsupported judgment | PASS |

==================================================
V1 EXIT STATUS
==================================================

**NOT READY**

## Remaining BLOCKERS

- BLOCKER: mixed-irrelevant: MISSED_GOLD_RELATIONSHIP

## V2 Backlog

- same-topic-different-claims: MISSING_FINAL_JUDGMENT (allowed for this fixture)
- mixed-irrelevant: MISSING_FINAL_JUDGMENT (secondary: recall failure left verified=0)
- mixed-irrelevant: Gold pair source_1↔source_2: candidate reached POST_LLM → REJECT (RELATIONSHIP_PROPOSITION_HALLUCINATION). Composite alignment score below required threshold.

---

Raw: `reports/reasoning-suite-raw.json`
Per-fixture LIVE snapshots: `reports/benchmark/<fixtureId>-raw.json`