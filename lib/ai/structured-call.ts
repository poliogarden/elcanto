import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { z } from 'zod'
import { getModelForRole } from '@/lib/ai/config'
import {
  estimateTokensFromChars,
  logLLMCallProfile,
  logPromptPayloadAnalysis,
} from '@/lib/ai/llm-profiler'
import { recordAIUsage } from '@/lib/ai/usage/logger'
import type { AIOperation } from '@/lib/ai/usage/types'

export type ModelRole = 'coverage' | 'analysis' | 'synthesis' | 'ask'

export async function callStructured<T>(input: {
  openai: OpenAI
  role: ModelRole
  operation: AIOperation
  system: string
  user: string
  schema: z.ZodType<T>
  schemaName: string
  retries?: number
  youtubeVideoId?: string
  contextObjectSize?: number
  maxOutputTokens?: number
  reasoningEffort?: string
}): Promise<T> {
  const model = getModelForRole(input.role)
  const retries = input.retries ?? 2
  const promptCharLength = input.system.length + input.user.length

  logPromptPayloadAnalysis({
    stage: input.operation,
    system: input.system,
    user: input.user,
    contextObjectSize: input.contextObjectSize,
  })

  let lastError: unknown
  let timeoutCount = 0
  for (let attempt = 0; attempt <= retries; attempt++) {
    const requestStart = Date.now()
    const requestStartIso = new Date(requestStart).toISOString()
    try {
      const completion = await input.openai.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user },
        ],
        response_format: zodResponseFormat(input.schema, input.schemaName),
        ...(input.maxOutputTokens != null ? { max_tokens: input.maxOutputTokens } : {}),
      })

      const requestEnd = Date.now()
      const parsed = completion.choices[0]?.message?.parsed
      if (!parsed) {
        throw new Error(`OpenAI returned empty parsed response for ${input.schemaName}.`)
      }

      const usage = completion.usage
      const tokens = {
        inputTokens: usage?.prompt_tokens ?? null,
        outputTokens: usage?.completion_tokens ?? null,
        cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? null,
        reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? null,
      }

      await recordAIUsage({
        operation: input.operation,
        model,
        usage,
        durationMs: requestEnd - requestStart,
        success: true,
        retryCount: attempt,
        youtubeVideoId: input.youtubeVideoId,
        promptCharLength,
        systemCharLength: input.system.length,
        contextObjectSize: input.contextObjectSize ?? null,
        maxOutputTokens: input.maxOutputTokens ?? null,
        reasoningEffort: input.reasoningEffort ?? null,
      })

      logLLMCallProfile({
        stage: input.operation,
        model,
        reasoningEffort: input.reasoningEffort ?? null,
        inputTokens: tokens.inputTokens,
        cachedInputTokens: tokens.cachedInputTokens,
        outputTokens: tokens.outputTokens,
        reasoningTokens: tokens.reasoningTokens,
        maxOutputTokens: input.maxOutputTokens ?? null,
        promptCharacterLength: promptCharLength,
        systemCharacterLength: input.system.length,
        contextObjectSize: input.contextObjectSize ?? null,
        estimatedInputTokensFromChars: estimateTokensFromChars(promptCharLength),
        requestStart: requestStartIso,
        firstTokenTime: null,
        requestEnd: new Date(requestEnd).toISOString(),
        durationMs: requestEnd - requestStart,
        retryCount: attempt,
        timeoutCount,
        jsonRepairCount: 0,
        success: true,
      })

      return parsed
    } catch (error) {
      lastError = error
      const requestEnd = Date.now()
      if (error instanceof Error && /timeout/i.test(error.message)) {
        timeoutCount += 1
      }

      await recordAIUsage({
        operation: input.operation,
        model,
        usage: null,
        durationMs: requestEnd - requestStart,
        success: false,
        retryCount: attempt,
        youtubeVideoId: input.youtubeVideoId,
        promptCharLength,
        systemCharLength: input.system.length,
        contextObjectSize: input.contextObjectSize ?? null,
        maxOutputTokens: input.maxOutputTokens ?? null,
        reasoningEffort: input.reasoningEffort ?? null,
      })

      logLLMCallProfile({
        stage: input.operation,
        model,
        reasoningEffort: input.reasoningEffort ?? null,
        inputTokens: null,
        cachedInputTokens: null,
        outputTokens: null,
        reasoningTokens: null,
        maxOutputTokens: input.maxOutputTokens ?? null,
        promptCharacterLength: promptCharLength,
        systemCharacterLength: input.system.length,
        contextObjectSize: input.contextObjectSize ?? null,
        estimatedInputTokensFromChars: estimateTokensFromChars(promptCharLength),
        requestStart: requestStartIso,
        firstTokenTime: null,
        requestEnd: new Date(requestEnd).toISOString(),
        durationMs: requestEnd - requestStart,
        retryCount: attempt,
        timeoutCount,
        jsonRepairCount: 0,
        success: false,
      })

      if (attempt < retries) continue
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI structured call failed.')
}

export async function callChatCompletion(input: {
  openai: OpenAI
  role: ModelRole
  operation: AIOperation
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  retries?: number
}): Promise<string> {
  const model = getModelForRole(input.role)
  const retries = input.retries ?? 1

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const started = Date.now()
    try {
      const completion = await input.openai.chat.completions.create({
        model,
        messages: input.messages,
      })

      const content = completion.choices[0]?.message?.content ?? ''
      await recordAIUsage({
        operation: input.operation,
        model,
        usage: completion.usage,
        durationMs: Date.now() - started,
        success: true,
        retryCount: attempt,
      })
      return content
    } catch (error) {
      lastError = error
      await recordAIUsage({
        operation: input.operation,
        model,
        usage: null,
        durationMs: Date.now() - started,
        success: false,
        retryCount: attempt,
      })
      if (attempt < retries) continue
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI chat completion failed.')
}
