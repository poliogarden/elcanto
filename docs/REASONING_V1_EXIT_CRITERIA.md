# elcanto Reasoning Engine v1 Exit Criteria

## Core Invariants

Evidence before inference.

Same topic != same proposition.

Judgment must not be stronger than evidence.

No relationship is a valid result.

Human retains final judgment.

## Graduation Requirements

1. MCP Regression PASS
2. Clear Agreement PASS
3. Clear Divide PASS
4. Same Topic / Different Claims PASS
5. Mixed / Irrelevant PASS
6. Overall relationship precision >= 90%
7. No critical obvious gold relationship recall failure
8. False relationship used in Judgment = 0
9. Unsupported Final Judgment = 0
10. Evidence Integrity PASS
11. Fixture-specific production hardcoding = 0

모두 만족하면:

**READY FOR BLIND TEST**

하나라도 critical failure이면:

**NOT READY**

## Execution

```bash
npm run eval:reasoning:suite
```

Report: `reports/reasoning-suite-report.md`

Raw: `reports/reasoning-suite-raw.json`

Gold expectations live only in the evaluation layer (`lib/reasoning/eval/benchmark-gold.ts` and related eval modules). Production reasoning algorithm must not be tuned to individual benchmark fixtures.
