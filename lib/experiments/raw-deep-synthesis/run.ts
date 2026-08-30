import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getOpenAIClient } from '@/lib/ai/openai'
import { getModelForRole } from '@/lib/ai/config'
import { RAW_DEEP_SYNTHESIS_INSTRUCTION } from '@/lib/experiments/raw-deep-synthesis/instruction'
import { loadFullTranscriptForExperiment } from '@/lib/experiments/raw-deep-synthesis/load-transcripts'
import {
  RAW_EXPERIMENT_QUESTION,
  RAW_EXPERIMENT_SOURCES,
} from '@/lib/experiments/raw-deep-synthesis/sources'

export type RawDeepSynthesisRunResult = {
  model: string
  apiCalls: number
  latencyMs: number
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  transcripts: Array<{
    label: string
    videoId: string
    characterCount: number
    segmentCount: number
    transcriptSource: string
    analysisCachePresent: boolean
  }>
  userQuestion: string
  rawOutput: string
  reportPath: string
}

function buildUserMessage(
  question: string,
  loaded: Awaited<ReturnType<typeof loadFullTranscriptForExperiment>>[],
): string {
  const parts = [`USER QUESTION\n${question}\n`]

  for (let i = 0; i < loaded.length; i++) {
    const item = loaded[i]
    parts.push(
      `SOURCE ${i + 1} — ${item.label}`,
      `video_id: ${item.videoId}`,
      `url: ${item.url}`,
      item.title ? `title: ${item.title}` : '',
      `transcript_segments: ${item.segmentCount}`,
      `transcript_chars: ${item.characterCount}`,
      '--- FULL TRANSCRIPT ---',
      item.formattedTranscript,
      '',
    )
  }

  return parts.filter(Boolean).join('\n')
}

function buildReport(result: RawDeepSynthesisRunResult): string {
  const transcriptLines = result.transcripts
    .map(
      (t, i) =>
        `Source ${i + 1} (${t.label} / ${t.videoId}): ${t.characterCount} chars / ${t.segmentCount} segments · transcript=${t.transcriptSource} · analysis_cache=${t.analysisCachePresent ? 'yes' : 'no'}`,
    )
    .join('\n')

  return `# RAW DEEP SYNTHESIS EXPERIMENT RESULT

## Production modified
NO

## Model
${result.model}

## API calls
${result.apiCalls}

## Input
${transcriptLines}

## User Question
${result.userQuestion}

## RAW MODEL OUTPUT

${result.rawOutput}

## Performance
Latency: ${result.latencyMs}ms
Input tokens: ${result.inputTokens ?? 'n/a'}
Output tokens: ${result.outputTokens ?? 'n/a'}
Total tokens: ${result.totalTokens ?? 'n/a'}

## Existing elcanto stages bypassed
- Evidence Retrieval: YES
- Claim Extraction: YES
- SourceConcept: YES
- ConnectionConcept: YES
- Relationship Engine: YES
- Insight Validation: YES
- Graph Generation: YES

## Files Added
- lib/experiments/raw-deep-synthesis/instruction.ts
- lib/experiments/raw-deep-synthesis/sources.ts
- lib/experiments/raw-deep-synthesis/load-transcripts.ts
- lib/experiments/raw-deep-synthesis/run.ts
- lib/experiments/raw-deep-synthesis/raw-deep-synthesis.runner.test.ts
- scripts/experiment-raw-synthesis.mjs

## Existing Files Modified
- package.json (npm script only)

## Errors / Limitations
Single-shot experiment; no structured output schema; full transcripts from YouTube captions (same ingestion source as elcanto analyze pipeline).
`
}

export async function runRawDeepSynthesisExperiment(): Promise<RawDeepSynthesisRunResult> {
  const model = getModelForRole('synthesis')
  const openai = getOpenAIClient()

  const loaded = await Promise.all(
    RAW_EXPERIMENT_SOURCES.map((source) => loadFullTranscriptForExperiment(source)),
  )

  const userMessage = buildUserMessage(RAW_EXPERIMENT_QUESTION, loaded)
  const started = Date.now()

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: RAW_DEEP_SYNTHESIS_INSTRUCTION },
      { role: 'user', content: userMessage },
    ],
    max_completion_tokens: 6000,
  })

  const latencyMs = Date.now() - started
  const rawOutput = completion.choices[0]?.message?.content ?? ''

  const result: RawDeepSynthesisRunResult = {
    model,
    apiCalls: 1,
    latencyMs,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    totalTokens: completion.usage?.total_tokens ?? null,
    transcripts: loaded.map((t) => ({
      label: t.label,
      videoId: t.videoId,
      characterCount: t.characterCount,
      segmentCount: t.segmentCount,
      transcriptSource: t.transcriptSource,
      analysisCachePresent: t.analysisCachePresent,
    })),
    userQuestion: RAW_EXPERIMENT_QUESTION,
    rawOutput,
    reportPath: '',
  }

  const report = buildReport(result)
  const reportDir = path.join(process.cwd(), 'reports')
  await mkdir(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, 'raw-deep-synthesis-experiment.md')
  await writeFile(reportPath, report, 'utf8')
  result.reportPath = reportPath

  return result
}
