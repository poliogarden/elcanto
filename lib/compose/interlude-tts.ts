import OpenAI from 'openai'
import { getOpenAIApiKey } from '@/lib/ai/config'
import { recordAIUsage } from '@/lib/ai/usage/logger'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getOpenAIApiKey() })
  }
  return client
}

export type InterludeSpeechResult = {
  audio: Buffer
  durationSeconds: number
  format: 'mp3'
}

/** Estimate speech duration from word count (~2.5 words/sec). */
export function estimateSpeechDuration(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.min(30, Math.ceil(words / 2.5)))
}

export async function synthesizeInterludeSpeech(text: string): Promise<InterludeSpeechResult> {
  const trimmed = text.trim().slice(0, 500)
  if (!trimmed) {
    throw new Error('Interlude text is empty.')
  }

  const started = Date.now()
  const response = await getClient().audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input: trimmed,
    response_format: 'mp3',
  })

  const arrayBuffer = await response.arrayBuffer()
  const audio = Buffer.from(arrayBuffer)

  await recordAIUsage({
    operation: 'TTS',
    model: 'tts-1',
    usage: null,
    durationMs: Date.now() - started,
    success: true,
  })

  return {
    audio,
    durationSeconds: estimateSpeechDuration(trimmed),
    format: 'mp3',
  }
}
