# elcanto Reasoning v1 Graduation Report

Generated At: 2026-08-29T17:24:34.313Z
Commit: 70ea277ee9e98b45c1863600942a3f279c7cca3b
Engine: reasoning-v2.2
Pipeline Mode: LIVE

## Summary

| Fixture | Evidence | Precision | Recall | Judgment | Result |
|---|---|---:|---:|---|---|
| MCP Baseline | FAIL | 0% | 0% | N/A | FAIL |
| Clear Agreement | PASS | 100% | 100% | SUPPORTED | PASS |
| Clear Divide | PASS | 0% | 0% | N/A | FAIL |
| Same Topic / Different Claims | PASS | 100% | 100% | N/A | PASS |
| Mixed / Irrelevant | PASS | 100% | 100% | SUPPORTED | PASS |

## Overall Relationship Quality

Precision: 60%
Recall: 60%

False Agreement: 0
False Divide: 0
False Complementary: 0

Missed Gold Relationships: 1

## Judgment Safety

Supported: 6
Unsupported: 0
False relationships used by Judgment: 0

## Regression

MCP regression: FAIL
Evidence regression: FAIL
Relationship regression: PASS
Judgment regression: PASS

MCP guard failures:
- NO_REASONING_OUTPUT

## Fixture Details

### MCP Baseline (mcp-3video-baseline)

Result: **FAIL**

Failure reasons:
- Cannot read properties of undefined (reading 'trim')
- NO_REASONING_OUTPUT

Blockers:
- Cannot read properties of undefined (reading 'trim')
- NO_REASONING_OUTPUT

Pipeline diagnosis:
- No reasoning output for diagnosis.

| Metric | Value |
|---|---:|
| Total extracted claims | 0 |
| Evidence-supported claims | 0 |
| Relevance usable | 0 |
| Generation eligible | 0 |
| Candidates | 0 |
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
| Judgment lineage | N/A |
| Reasoning quality (E2E) | NOT_EVALUATED |


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
| Final judgment | Remote work effectively reduces the daily commuting time that employees spend traveling to a workplace. |
| Supported propositions | 3 |
| Unsupported propositions | 0 |
| Judgment confidence | moderate |
| Judgment lineage | PASS |
| Reasoning quality (E2E) | PASS |

Participating sources: source_1, source_2

Excluded / non-generating sources:
- source_3: NOT_IN_GENERATION

### Clear Divide (clear-divide)

Result: **FAIL**

Failure reasons:
- MISSED_GOLD_RELATIONSHIP (missed=1, recall=0)
- divide=0 (need >= 1)
- expectedParticipatingSource missing from generation: source_1
- expectedParticipatingSource missing from generation: source_2

Blockers:
- MISSED_GOLD_RELATIONSHIP
- expectedParticipatingSource missing from generation: source_1
- expectedParticipatingSource missing from generation: source_2

Pipeline diagnosis:
- BLOCKER: No candidate pairs generated — failure likely in relevance funnel, comparable claim pool, or candidate discovery.

| Metric | Value |
|---|---:|
| Total extracted claims | 1 |
| Evidence-supported claims | 1 |
| Relevance usable | 0 |
| Generation eligible | 0 |
| Candidates | 0 |
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


### Same Topic / Different Claims (same-topic-different-claims)

Result: **PASS**

Pipeline diagnosis:
- BLOCKER: No candidate pairs generated — failure likely in relevance funnel, comparable claim pool, or candidate discovery.

| Metric | Value |
|---|---:|
| Total extracted claims | 0 |
| Evidence-supported claims | 0 |
| Relevance usable | 0 |
| Generation eligible | 0 |
| Candidates | 0 |
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


### Mixed / Irrelevant (mixed-irrelevant)

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
| Final judgment | It is recommended that cold-climate home retrofits achieve an attic insulation R-value of at least R-49, with a typical range extending up to R-60. |
| Supported propositions | 3 |
| Unsupported propositions | 0 |
| Judgment confidence | moderate |
| Judgment lineage | PASS |
| Reasoning quality (E2E) | PASS |

Participating sources: source_1, source_2

Excluded / non-generating sources:
- source_3: NOT_IN_GENERATION
- source_4: NOT_IN_GENERATION
- source_5: NOT_IN_GENERATION

## Standalone vs Suite Reproducibility

Standalone before: N/A
Suite MCP: claims=0 genEligible=0 candidates=0 verified=0 agreement=0 divide=0 judgment=N/A evidence=PASS model=gpt-4o-mini (default) temp=default seed=none
Standalone after: N/A

## Metric Population Audit

| Fixture | Extracted | Evidence-supported | Relevance usable | Gen eligible | Candidates | Verified | Invariant |
|---|---:|---:|---:|---:|---:|---:|---|
| MCP Baseline | 0 | 0 | 0 | 0 | 0 | 0 | PASS |
| Clear Agreement | 2 | 2 | 2 | 2 | 1 | 1 | PASS |
| Clear Divide | 1 | 1 | 0 | 0 | 0 | 0 | PASS |
| Same Topic / Different Claims | 0 | 0 | 0 | 0 | 0 | 0 | PASS |
| Mixed / Irrelevant | 2 | 2 | 2 | 2 | 1 | 1 | PASS |

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
- sharedProposition: attic retrofit insulation levels target R-49
- entailedByA: true, entailedByB: true, addedInference: false
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

- BLOCKER: mcp-3video-baseline: Cannot read properties of undefined (reading 'trim')
- BLOCKER: mcp-3video-baseline: NO_REASONING_OUTPUT
- BLOCKER: clear-divide: MISSED_GOLD_RELATIONSHIP
- BLOCKER: clear-divide: expectedParticipatingSource missing from generation: source_1
- BLOCKER: clear-divide: expectedParticipatingSource missing from generation: source_2

## V2 Backlog

- clear-divide: MISSING_FINAL_JUDGMENT (secondary: recall failure left verified=0)
- clear-divide: BLOCKER: No candidate pairs generated — failure likely in relevance funnel, comparable claim pool, or candidate discovery.
- same-topic-different-claims: MISSING_FINAL_JUDGMENT (allowed for this fixture)

---

Raw: `reports/reasoning-suite-raw.json`
Per-fixture LIVE snapshots: `reports/benchmark/<fixtureId>-raw.json`