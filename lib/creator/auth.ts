import { requireAuthUserId, getSessionUser } from '@/lib/auth/user'
import { DEMO_USER_ID } from '@/lib/creator/config'

export async function resolveCreatorUserId(): Promise<string> {
  const auth = await requireAuthUserId()
  if (auth?.userId) return auth.userId
  const session = await getSessionUser()
  if (session?.email) return `local-${session.email}`
  return DEMO_USER_ID
}
