import { withElcantoSystem } from '@/lib/prompts/elcanto-system'

export const SINGLE_VIDEO_TASK_PROMPT = `TASK: Individual Video Deep Analysis (Stage 1)

Analyze ONE YouTube video transcript in isolation. This is NOT a summary task.

Extract structured knowledge in this order:
topic → central question → core claims (with reasoning + evidence) → assumptions → counter-arguments → limitations → unique perspective → implications → deep insights.

Requirements:
- Each claim needs a unique id: "{sourceId}_claim_N"
- sourceId must match exactly the provided sourceId
- claims[].statement: the actual claim (specific, falsifiable when possible)
- claims[].reasoning: why the speaker believes this
- claims[].evidenceSummary: transcript-based support (paraphrase; cite timestamps in evidence[])
- evidence[]: timestamped excerpts supporting claims
- assumptions[]: unstated premises the argument relies on
- counterArguments[]: objections the speaker addresses or ignores
- limitations[]: what the video does not establish
- uniquePerspective: what is distinctive about THIS video's angle
- deepInsights[]: non-obvious insights with whyItMatters and supportingReasoning
- summary: 2-4 sentences — orientation only, not a substitute for claims
- thesis: the video's central argumentative position

Even for a single video, go beyond "3-line summary". Depth over brevity.
Return valid JSON matching the schema.`

export function buildSingleVideoSystemPrompt(sourceId: string): string {
  return withElcantoSystem(
    `${SINGLE_VIDEO_TASK_PROMPT}\n\nUse sourceId exactly: "${sourceId}".`,
  )
}
