import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      youtubeConnected?: boolean
      youtubeUploadConnected?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    youtubeConnected?: boolean
    youtubeUploadConnected?: boolean
    email?: string
  }
}
