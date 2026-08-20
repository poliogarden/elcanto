import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'

export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return session.user
}

export async function getSupabaseUserId(email: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
  return data?.id ?? null
}

export async function requireAuthUserId(): Promise<{ email: string; userId: string } | null> {
  const user = await getSessionUser()
  if (!user?.email) return null
  const userId = await getSupabaseUserId(user.email)
  if (!userId) return null
  return { email: user.email, userId }
}
