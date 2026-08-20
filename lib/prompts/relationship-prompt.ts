import { withElcantoSystem } from '@/lib/prompts/elcanto-system'

export const RELATIONSHIP_TASK_PROMPT = `TASK: Relationship Engine (Stage 2)

You receive STRUCTURED per-video analyses — not raw transcripts.
Discover meaningful relationships between claims across sources.

Find:
1. AGREEMENT / PARTIAL_AGREEMENT — shared substantive claims (not shared topics)
2. DISAGREEMENT — conflicting positions on the same issue
3. COMPLEMENTARY — different pieces that combine into a fuller picture
4. STRUCTURAL_PARALLEL — different domains, similar underlying pattern
5. SHARED_TOPIC — both mention a topic but do NOT agree (strength < 0.5)
6. INDEPENDENT — no meaningful connection (strength < 0.30)

ABSOLUTE RULES:
- Coverage ≠ Agreement. Both mention "AI" is NOT agreement.
- shared_topic ≠ agreement
- Do NOT create agreement from vague generalizations
- Include independent pairs explicitly
- Every relationship must reference fromClaimId, toClaimId, fromSourceId, toSourceId
- Use source_{voiceIndex} for source IDs

Also identify:
- clusters: groups of sources sharing a substantive theme
- independentSourceIds: sources with no strong cross-source ties

Return valid JSON matching schema.`

export const RELATIONSHIP_SYSTEM_PROMPT = withElcantoSystem(RELATIONSHIP_TASK_PROMPT)
