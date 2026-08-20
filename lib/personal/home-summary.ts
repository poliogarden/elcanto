import type { PersonalHomeSummary, PersonalProfile } from '@/lib/types/personal'

export function buildHomeSummary(profile: PersonalProfile | null): PersonalHomeSummary {
  if (!profile || profile.signalCount < 2) {
    return {
      hasProfile: false,
      currentThread: '',
      threadNarrative: null,
      emerging: [],
      connection: null,
      gap: null,
      lastSyncedAt: profile?.lastSyncedAt ?? null,
    }
  }

  const emerging = profile.tasteByWindow?.['30d']?.emerging ?? profile.emerging ?? []

  return {
    hasProfile: true,
    currentThread: profile.currentThread,
    threadNarrative: profile.inferredPatterns[0] ?? profile.personalSynthesis ?? null,
    emerging: emerging.slice(0, 3).map((e) => e.label),
    connection: profile.inferredPatterns[0] ?? null,
    gap: profile.gaps[0] ?? null,
    lastSyncedAt: profile.lastSyncedAt,
  }
}
