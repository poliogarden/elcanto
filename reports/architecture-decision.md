# Architecture Decision

**DECISION: SIMPLIFY**

**CONFIDENCE: MEDIUM** (PROVISIONAL)

## WHY

- B wins more cases with better weighted quality and acceptable precision
- A returned zero verified relationships on 2 non-mixed sets (catastrophic funnel risk)

## WHAT A DID BETTER

- See per-case scores

## WHAT B DID BETTER

- Lower end-to-end latency
- Higher weighted product quality score

## QUALITY

| | A | B |
|--|--|--|
| Avg weighted score | 3.32 | 4.03 |
| User pref wins | 0 | 6 |
| Ties | 0 | |
| Neither | 0 | |

## EVIDENCE

| Precision | A | B |
|-----------|--|--|
| Average | 1.00 | 1.00 |

## RECALL

| | A | B |
|--|--|--|
| Average | 0.80 | 0.73 |

## FALSE RELATIONSHIPS / HALLUCINATIONS

See per-case inventedRelationship* and hallucinationPenaltyB in architecture-ab-results.json

## LATENCY (ms)

| | A | B |
|--|--|--|
| Average | 6486 | 4458 |

## COST (USD est.)

| | A | B |
|--|--|--|
| Average | 0.0007 | 0.0006 |

## COMPLEXITY

### A (V2.2)

Stages: 12, modules: 45, typical LLM calls (3 src): 8

### B (Direct)

Stages: 4, modules: 6, typical LLM calls (3 src): 4

## OBSERVED FAILURE MODES

### A

- extraction
- relevance
- alignment
- participation
- candidate
- comparability
- verification
- consolidation
- judgment

### B

- evidence_retrieval
- source_answer
- cross_source_synthesis
- evidence_validation

## WHAT TO KEEP / DELETE / REUSE

- **KEEP:** Shared ingestion, evidence timestamps, cost telemetry, acceptance harness
- **DELETE (if SIMPLIFY):** Candidate funnel as primary reasoner — decision-dependent
- **REUSE:** Direct per-source answers + cross-source step as primary; V2 verifier as optional layer (HYBRID)

## NEXT ARCHITECTURE

Replace relationship-first primary path with direct cross-source synthesis + lightweight validation

## DATA COVERAGE

- Real YouTube sets run: 0
- Synthetic structured sets run: 6

## If we were starting elcanto today

Build question-first direct synthesis with evidence validation; add relationship verification only where needed.
