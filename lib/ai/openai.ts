import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { AI_CONFIG, getModelForRole, getOpenAIApiKey } from '@/lib/ai/config'
import type {
  AIProvider,
  AnalyzeVideoInput,
  AnswerAcrossVideosInput,
  SynthesizeVideosInput,
} from '@/lib/ai/provider'
import type { AskAnswer, SynthesisResult, VideoAnalysis } from '@/lib/types/analysis'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getOpenAIApiKey() })
  }
  return client
}

const ClaimSchema = z.object({
  id: z.string(),
  statement: z.string(),
  importance: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()),
})

const EvidenceSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  text: z.string(),
})

const VideoAnalysisSchema = z.object({
  videoId: z.string(),
  summary: z.string(),
  thesis: z.string(),
  keyClaims: z.array(ClaimSchema),
  evidence: z.array(EvidenceSchema),
  topics: z.array(z.string()),
  stance: z.string().optional(),
})

const ConsensusItemSchema = z.object({
  claim: z.string(),
  supportingVoiceIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

const DisagreementSideSchema = z.object({
  label: z.string(),
  voiceIds: z.array(z.string()),
  summary: z.string(),
  evidenceIds: z.array(z.string()),
})

const DisagreementItemSchema = z.object({
  question: z.string(),
  sides: z.array(DisagreementSideSchema).min(2),
})

const MinorityInsightSchema = z.object({
  claim: z.string(),
  detail: z.string(),
  voiceIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  mentionedBy: z.number(),
  total: z.number(),
})

const SynthesisResultSchema = z.object({
  topic: z.string(),
  bottomLine: z.string(),
  bottomLineHeadline: z.array(z.string()).optional(),
  consensus: z.array(ConsensusItemSchema),
  disagreements: z.array(DisagreementItemSchema),
  minorityInsights: z.array(MinorityInsightSchema),
  overallConclusion: z.string(),
})

const AskAnswerSchema = z.object({
  answer: z.string(),
  basedOnVoiceIds: z.array(z.string()),
  evidence: z.array(
    z.object({
      videoId: z.string(),
      timestamp: z.number(),
      text: z.string(),
    }),
  ),
})

async function callStructured<T>(
  role: 'analysis' | 'synthesis' | 'ask',
  system: string,
  user: string,
  schema: z.ZodType<T>,
  schemaName: string,
  retries = 2,
): Promise<T> {
  const openai = getClient()
  const model = getModelForRole(role)

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await openai.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: zodResponseFormat(schema, schemaName),
      })

      const parsed = completion.choices[0]?.message?.parsed
      if (!parsed) {
        throw new Error(`OpenAI returned empty parsed response for ${schemaName}.`)
      }
      return parsed
    } catch (error) {
      lastError = error
      if (attempt < retries) continue
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI structured call failed.')
}

function formatTranscriptForPrompt(chunks: AnalyzeVideoInput['transcript']): string {
  return chunks
    .map((c) => `[${Math.floor(c.start)}s] ${c.text}`)
    .join('\n')
}

export const openaiProvider: AIProvider = {
  async analyzeVideo(input: AnalyzeVideoInput): Promise<VideoAnalysis> {
    const system = `You analyze a single YouTube video transcript. Extract structured claims with linked evidence timestamps. Only cite evidence that appears in the transcript. Return valid JSON matching the schema.`

    const user = `Video ID: ${input.videoId}
Title: ${input.title}
Channel: ${input.channel}

Transcript:
${formatTranscriptForPrompt(input.transcript)}`

    return callStructured(
      'analysis',
      system,
      user,
      VideoAnalysisSchema,
      'video_analysis',
    )
  },

  async synthesizeVideos(input: SynthesizeVideosInput): Promise<SynthesisResult> {
    const system = `You synthesize multiple video analyses into consensus, real disagreements on the same question, and valuable minority insights. Cluster semantically similar claims. Do not invent evidence.

Use voice-{voiceIndex} format for all voice ID references (e.g. voice-1, voice-3) matching the voiceIndex field in each analysis.
Return valid JSON matching the schema.`

    const user = `Topic hint: ${input.topic ?? 'Infer from analyses'}

Video analyses (JSON):
${JSON.stringify(input.analyses, null, 2)}`

    return callStructured(
      'synthesis',
      system,
      user,
      SynthesisResultSchema,
      'synthesis_result',
    )
  },

  async answerAcrossVideos(input: AnswerAcrossVideosInput): Promise<AskAnswer> {
    const system = `Answer the user's question using only the provided synthesis, analyses, and transcript excerpts. Cite specific video evidence with timestamps. Use voice-{index} format for basedOnVoiceIds. Return valid JSON matching the schema.`

    const user = `Question: ${input.question}

Synthesis:
${JSON.stringify(input.synthesis, null, 2)}

Relevant transcript excerpts:
${JSON.stringify(input.relevantChunks, null, 2)}`

    return callStructured('ask', system, user, AskAnswerSchema, 'ask_answer')
  },
}

export function getAIProvider(): AIProvider {
  return openaiProvider
}

export { AI_CONFIG }
