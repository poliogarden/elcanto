import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import type { SynthesisDocument } from '@/lib/types/synthesis-document'
import { synthesisCollectionKey } from '@/lib/cache/keys'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ entries: [], source: 'local' })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ entries: [], source: 'local' })
  }

  const supabase = createClient(url, key)
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!user) return NextResponse.json({ entries: [], source: 'local' })

  const { data } = await supabase
    .from('syntheses')
    .select('id, number, topic, voice_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const entries =
    data?.map((row) => ({
      id: row.id,
      number: row.number,
      question: row.topic,
      voiceCount: row.voice_count,
      date: new Date(row.created_at)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        .toUpperCase(),
    })) ?? []

  return NextResponse.json({ entries, source: 'supabase' })
}

export async function POST(request: Request) {
  const body = (await request.json()) as { document?: SynthesisDocument }
  if (!body.document || body.document.status !== 'complete' || !body.document.result) {
    return NextResponse.json({ error: 'Complete synthesis document required.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ saved: true, source: 'local' })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in with Google to save to archive.' }, { status: 401 })
  }

  const supabase = createClient(url, key)
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .maybeSingle()

  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 401 })
  }

  const doc = body.document
  if (!doc.result) {
    return NextResponse.json({ error: 'Complete synthesis document required.' }, { status: 400 })
  }

  const videoIds = doc.voices.map((v) => v.voice.youtubeId)
  const collectionHash = synthesisCollectionKey(videoIds)

  await supabase.from('syntheses').upsert({
    id: doc.id,
    user_id: user.id,
    number: doc.number,
    topic: doc.result.topic,
    voice_count: doc.voices.length,
    collection_hash: collectionHash,
    status: 'complete',
    document: doc,
    created_at: doc.createdAt,
  })

  return NextResponse.json({ saved: true, source: 'supabase' })
}
