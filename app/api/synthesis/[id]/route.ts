import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const supabase = createClient(url, key)
  const { data } = await supabase
    .from('syntheses')
    .select('document')
    .eq('id', id)
    .maybeSingle()

  if (!data?.document) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  return NextResponse.json({ document: data.document })
}
