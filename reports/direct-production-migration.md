# Direct Production Migration

**Production engine:** `direct`

**V2.2 status:** frozen / preserved (`ELCANTO_REASONING_ENGINE=legacy-v2` only)

## Changes

- `lib/synthesis/synthesis-job-runner.ts` — default `direct`; V2 only via env override
- `lib/direct-synthesis/persisted.ts` — document persistence shape
- `components/direct-synthesis/direct-synthesis-board.tsx` — consumer Result UI
- `app/synthesis/[id]/page.tsx` — direct vs legacy renderer branch

## Smoke test

```bash
pnpm eval:direct-production-smoke
```

Uses production `runSynthesisJob` with Case A YouTube sources (cached transcripts).
