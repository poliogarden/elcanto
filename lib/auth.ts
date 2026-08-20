import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'
import { saveYouTubeConnection } from '@/lib/personal/signals-repository'
import {
  hasYouTubeReadScope,
  hasYouTubeUploadScope,
} from '@/lib/youtube/scopes'

export { YOUTUBE_SCOPES } from '@/lib/youtube/scopes'

function localUserIdFromEmail(email: string): string {
  return `local-${email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
}

async function persistYouTubeTokens(
  userId: string,
  account: { access_token?: string; refresh_token?: string | null; expires_at?: number | null; scope?: string | null },
  options?: { useSupabase?: boolean },
) {
  if (!account.access_token) return
  const scopes = account.scope?.split(' ') ?? []
  if (!hasYouTubeReadScope(scopes) && !hasYouTubeUploadScope(scopes)) return

  await saveYouTubeConnection(
    userId,
    {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
      scopes,
    },
    options,
  )
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.providerAccountId) return true

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key || !user.email) {
        if (user.email) {
          await persistYouTubeTokens(localUserIdFromEmail(user.email), account, { useSupabase: false })
        }
        return true
      }

      const supabase = createClient(url, key)
      const { data: upserted } = await supabase
        .from('users')
        .upsert(
          {
            google_id: account.providerAccountId,
            email: user.email,
            display_name: user.name ?? null,
            profile_image: user.image ?? null,
            last_login_at: new Date().toISOString(),
          },
          { onConflict: 'google_id' },
        )
        .select('id')
        .single()

      if (!upserted?.id) {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()
        if (existing?.id && account.access_token) {
          await persistYouTubeTokens(existing.id, account)
        }
        return true
      }

      if (account.access_token && upserted.id) {
        await persistYouTubeTokens(upserted.id, account)
      }

      return true
    },
    async jwt({ token, account, user }) {
      if (account) {
        const scopes = (account.scope ?? '').split(' ')
        token.youtubeConnected = hasYouTubeReadScope(scopes)
        token.youtubeUploadConnected = hasYouTubeUploadScope(scopes)
      }
      if (user?.email) token.email = user.email
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub
        session.user.youtubeConnected = Boolean(token.youtubeConnected)
        session.user.youtubeUploadConnected = Boolean(token.youtubeUploadConnected)
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
