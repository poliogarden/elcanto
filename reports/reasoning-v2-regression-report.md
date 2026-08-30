# Reasoning V2 Regression Report

Generated: 2026-08-29

## Precision guard

| Fixture | False Agreement | False Divide | False Complementary |
|---------|-----------------|--------------|---------------------|
| blind-same-topic-solar | 0 | 0 | 0 |
| blind-same-topic-quantum | 0 | 0 | 0 |
| blind-mixed-cycling | 0 | 0 | 0 |

Phase B regression: **PASS** (no false relationships on same-topic fixtures).

## V1 → V2 delta

| Metric | V1 | V2 | Delta |
|--------|----|----|-------|
| Blind precision | 100% | 100% | 0 |
| Blind recall | 27% | 63.6% | **+36.6pp** |
| False relationships | 0 | 0 | 0 |

## Unit / deterministic regression

| Suite | Result |
|-------|--------|
| proposition-semantics-recall | PASS |
| mcp-comparable-pool-regression | PASS |
| mcp-relevance-regression | PASS |
| heuristic-candidate-blind | PASS (after V2 candidate fixes) |
| pre-llm-coral | PASS |
| pre-llm-carbon | PASS |

## Graduation suite

**FAIL** — mixed-irrelevant and aggregate gates not satisfied in V2 blind graduation regression run.

## MCP baseline

Claims never collapsed to 0 across 5 runs (26–32). Verified relationships still variable (0–3 per run).
