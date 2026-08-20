import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getOpenAIApiKey } from '@/lib/ai/config'
import { callChatCompletion } from '@/lib/ai/structured-call'
import { buildPersonalProfileFromSignals } from '@/lib/personal/personal-insights'
import { resolvePersonalUser } from '@/lib/personal/resolve-user'
import {
  getImportedPlaylists,
  getPersonalSignals,
  getYouTubeConnection,
} from '@/lib/personal/signals-repository'

export async function POST(request: Request) {
  const ctx = await resolvePersonalUser()
  const storage = { useSupabase: ctx.useSupabase }

  const body = (await request.json()) as { question?: string }
  if (!body.question?.trim()) {
    return NextResponse.json({ error: 'Question required.' }, { status: 400 })
  }

  const signals = await getPersonalSignals(ctx.userId, storage)
  const connection = await getYouTubeConnection(ctx.userId, storage)
  const importedPlaylists = await getImportedPlaylists(ctx.userId, storage)
  const profile = await buildPersonalProfileFromSignals(
    ctx.userId,
    signals,
    !!connection,
    (connection?.last_synced_at as string) ?? null,
    importedPlaylists,
  )

  const openai = new OpenAI({ apiKey: getOpenAIApiKey() })
  const answer = await callChatCompletion({
    openai,
    role: 'ask',
    operation: 'PERSONAL_ASK',
    messages: [
      {
        role: 'system',
        content: `Answer questions about the user's personal taste and intellectual interests.
Base answers ONLY on provided signals and profile data.
Do not infer sensitive personal attributes.
Cite specific signal sources when relevant.
If data is insufficient, say so honestly.`,
      },
      {
        role: 'user',
        content: `Profile:\n${JSON.stringify(profile, null, 2)}\n\nQuestion: ${body.question}`,
      },
    ],
  })

  return NextResponse.json({ answer, signalCount: signals.length })
}
