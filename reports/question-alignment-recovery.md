# Question Alignment Recovery

**Date:** 2026-08-30  
**Engine:** `reasoning-v2.2` (verifier threshold unchanged)

## Problem

Production acceptance run: 75 claims marked relevance-usable, 35 candidates generated, **0 verified** — `CANDIDATE_VERIFICATION_COLLAPSE`. Sources were all "relevant" but addressed **different propositions** (53% accuracy vs failure/adaptation vs marketing).

Root cause: **source relevance** and **claim question alignment** were conflated. Almost all claims entered as SUPPORTING.

## Solution

### 1. Structured question intent

`lib/reasoning/v2/question-intent.ts` — `extractQuestionIntent()` produces:

- `subject`, `target`, `dimension`, `predicate`, `expectedAnswerType`, `topicTokens`

Not used as embedding-only relevance; drives per-claim alignment.

### 2. Claim question alignment

`lib/reasoning/v2/claim-question-alignment.ts`:

| Label | Meaning |
|-------|---------|
| DIRECT | Can answer central question directly |
| SUPPORTING | Needed evidence, not the answer itself |
| CONTEXTUAL | Same broad topic, not question-critical |
| UNRELATED | Off-topic |

Only **DIRECT + SUPPORTING** enter cross-source relationship funnel. CONTEXTUAL → peripheral (not generation).

### 3. Source answerability

`lib/reasoning/v2/source-answerability.ts`:

- `DIRECTLY_ANSWERABLE` / `PARTIALLY_ANSWERABLE` / `CONTEXT_ONLY` / `NOT_ANSWERABLE`
- Cross-source summary when only one source directly answers

## Pipeline integration

`pipeline.ts` after enhanced relevance:

1. Build `claimAlignments` for all claims
2. Filter `usableClaims` to DIRECT+SUPPORTING only
3. Filter `generationClaims` by alignment + shape guards
4. Store `questionIntent`, `sourceAnswerability`, alignment diagnostics on result

## Metrics added (`pipelineStats`)

- `claimAlignmentDirect` / `Supporting` / `Contextual` / `Unrelated`
- `directlyAnswerableSources`

## Regression

- Blind V2 runner: **PASS** (453s, precision/recall baseline preserved)
- Proposition alignment tests: **PASS**
- MCP comparable pool regression: **PASS**

## Expected production effect (53% / failure / marketing set)

- Fewer generation-eligible claims (CONTEXTUAL marketing claims excluded)
- Fewer meaningless candidates **before** verifier
- Verifier still last defense — threshold not lowered
