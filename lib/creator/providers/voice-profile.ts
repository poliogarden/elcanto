import type { VoiceProfile } from '@/lib/creator/types'

export const DEFAULT_VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'nova-en',
    provider: 'openai',
    voiceId: 'nova',
    language: 'en',
    speed: 1,
    style: 'analytical',
    sampleRate: 24000,
  },
  {
    id: 'nova-ko',
    provider: 'openai',
    voiceId: 'nova',
    language: 'ko',
    speed: 1,
    style: 'conversational',
    sampleRate: 24000,
  },
  {
    id: 'system-neutral',
    provider: 'system',
    voiceId: 'silent-estimate',
    language: 'en',
    speed: 1,
    style: 'neutral',
  },
]

export function resolveVoiceProfile(profileId?: string): VoiceProfile {
  return (
    DEFAULT_VOICE_PROFILES.find((p) => p.id === profileId) ??
    DEFAULT_VOICE_PROFILES.find((p) => p.id === 'nova-ko') ??
    DEFAULT_VOICE_PROFILES[0]
  )
}
