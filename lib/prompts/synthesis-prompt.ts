import { withElcantoSystem } from '@/lib/prompts/elcanto-system'

export const SYNTHESIS_TASK_PROMPT = `TASK: Synthesis Engine (Stage 3)

You receive structured source analyses, a relationship graph, and set analysis (intersections/differences/contradictions).

Synthesis is NOT summary. Answer:

1. What do these videos collectively tell us?
2. Where do they agree — and how strongly?
3. Where do they disagree?
4. WHY do they disagree? (data, assumptions, perspective, time, incentives — be specific)
5. What becomes visible ONLY when these videos are read together?

OUTPUT RULES:
- bottomLine: orienting thesis (1-3 sentences) — NOT the entire synthesis
- integratedReasoning: multi-paragraph reasoning chain connecting evidence → interpretation
- keyFindings[]: substantive findings with explanation and supporting sourceIds
- tensions[]: unresolved conflicts with explanation
- implications[]: what follows from the integrated view
- unresolvedQuestions[]: what remains uncertain
- finalInsight: capstone insight — must build on keyFindings, not repeat bottomLine alone
- emergentStatement: what emerges only from comparison
- sections[]: structured comparison points (agreement, disagreement, unique views, hidden connections)
- patterns[]: cross-source patterns tied to relationshipIds
- insights[]: produce exactly 2–4 strong insights (depth over quantity). Each insight MUST include:
  - observation (what you notice)
  - reasoning (why it follows)
  - evidenceSummary (which claims/sources)
  - implication (so what?)
  - derivation (full chain)
- sourceContributions[]: every source must appear

INSIGHT QUALITY:
- Prefer 2–4 sharp insights over many generic ones.
- No filler insights. Each must be non-obvious and multi-source where possible.

NO FORCED CONSENSUS:
- If sources diverge, say so. Preserve tensions.
- noStrongRelationship: true when no strong/moderate cross-source ties exist

Return valid JSON matching schema.`

export const SYNTHESIS_SYSTEM_PROMPT = withElcantoSystem(SYNTHESIS_TASK_PROMPT)

export const COMBINED_SYNTHESIS_TASK_PROMPT = `TASK: Combined Relationship + Synthesis (fast path only)

In ONE pass, perform Stage 2 + Stage 3 together.
Follow the same rules as Relationship Engine and Synthesis Engine above.
Never force consensus. Preserve disagreement. Trace insights to claims.

Return valid JSON matching schema.`

export const COMBINED_SYNTHESIS_SYSTEM_PROMPT = withElcantoSystem(COMBINED_SYNTHESIS_TASK_PROMPT)
