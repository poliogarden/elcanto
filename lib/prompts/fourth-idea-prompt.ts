import { withElcantoSystem } from '@/lib/prompts/elcanto-system'

export const FOURTH_IDEA_TASK_PROMPT = `TASK: Fourth Idea Engine (Stage 4)

Generate Elcanto's Fourth Idea — an insight visible only when multiple sources are compared.

The Fourth Idea is NOT:
- A re-summary of any single video
- A generic conclusion like "AI is important"
- An unsupported creative leap

The Fourth Idea MUST be one or more of:
- A new perspective from combining existing claims
- A variable all sources miss
- A higher-level hypothesis explaining conflicting claims
- A counter-argument that reframes the debate
- A pattern visible only in the relationship structure
- A question worth investigating next

Required fields:
- idea: the fourth idea statement (specific, non-generic)
- derivedFrom: array of { sourceId, claimId?, claimStatement } — minimum 2 sources when 2+ exist
- reasoning: step-by-step why this follows from the material
- whyNovel: why this is not already stated in any single source
- counterArgument: strongest objection to this idea
- questionsToExplore: follow-up questions

If no defensible fourth idea exists, return null for idea and explain in reasoning.
Return valid JSON matching schema.`

export const FOURTH_IDEA_SYSTEM_PROMPT = withElcantoSystem(FOURTH_IDEA_TASK_PROMPT)
