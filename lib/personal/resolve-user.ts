import { getSessionUser, getSupabaseUserId } from '@/lib/auth/user'
import { createClient } from '@supabase/supabase-js'

export const LOCAL_ANONYMOUS_USER_ID = 'local'

export type PersonalUserContext = {
  userId: string
  email?: string
  isAnonymous: boolean
  useSupabase: boolean
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function localUserIdFromEmail(email: string): string {
  return `local-${email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
}

/** Resolves personal data owner — anonymous local user when not signed in. */
export async function resolvePersonalUser(): Promise<PersonalUserContext> {
  const sessionUser = await getSessionUser()
  const supabase = getSupabase()

  if (sessionUser?.email && supabase) {
    const userId = await getSupabaseUserId(sessionUser.email)
    if (userId) {
      return {
        userId,
        email: sessionUser.email,
        isAnonymous: false,
        useSupabase: true,
      }
    }
  }

  if (sessionUser?.email) {
    return {
      userId: localUserIdFromEmail(sessionUser.email),
      email: sessionUser.email,
      isAnonymous: false,
      useSupabase: false,
    }
  }

  return {
    userId: LOCAL_ANONYMOUS_USER_ID,
    isAnonymous: true,
    useSupabase: false,
  }
}
