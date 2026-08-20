import { NextResponse } from 'next/server'
import { synthesizeInterludeSpeech } from '@/lib/compose/interlude-tts'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string }
    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'text required.' }, { status: 400 })
    }

    const speech = await synthesizeInterludeSpeech(body.text)
    const base64 = speech.audio.toString('base64')

    return NextResponse.json({
      audioBase64: base64,
      contentType: 'audio/mpeg',
      durationSeconds: speech.durationSeconds,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
