# Architecture A/B Test

**Run:** 2026-08-29T18:39:25.931Z

**DECISION: SIMPLIFY** (MEDIUM)

## Summary table

| CASE | A SCORE | B SCORE | USER PREF | A COST | B COST | A TIME ms | B TIME ms |
|------|---------|---------|-----------|--------|--------|-----------|-----------|
| case-01-agreement | 4.23 | 4.45 | B | 0.0013 | 0.0006 | 15129 | 3791 |
| case-02-divide | 3.99 | 4.21 | B | 0.0017 | 0.0006 | 12504 | 4476 |
| case-03-complementary | 2.55 | 3.65 | B | 0.0002 | 0.0005 | 1620 | 4400 |
| case-04-mixed | 3.55 | 3.90 | B | 0.0007 | 0.0008 | 5299 | 5248 |
| case-05-complex | 2.55 | 4.14 | B | 0.0003 | 0.0007 | 2307 | 4994 |
| case-06-mismatch | 3.05 | 3.80 | B | 0.0002 | 0.0005 | 2057 | 3837 |

## Aggregate

- A wins: 0
- B wins: 6
- Ties: 0
- Neither: 0

Raw outputs: reports/architecture-ab/case-*-a.json and case-*-b.json
