# Direct Cross-Source Synthesis Baseline

**Version:** direct-baseline-1.0

## Flow

Central Question → evidence retrieval → per-source answer → cross-source synthesis → validation

## Explicitly NOT used

- Relationship candidate generator
- Proposition verifier pipeline
- Agreement/Divide/Complementary engines
- Relationship consolidation
- Judgment gate on verified relationships

## Modules

- lib/experiments/direct-synthesis/evidence-retrieval.ts
- lib/experiments/direct-synthesis/per-source-answer.ts
- lib/experiments/direct-synthesis/cross-source-synthesis.ts
- lib/experiments/direct-synthesis/evidence-validation.ts
- lib/experiments/direct-synthesis/pipeline.ts

## Typical LLM calls (3 sources)

4 calls: 3 per-source + 1 cross-source
