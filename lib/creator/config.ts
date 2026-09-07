export const CREATOR_DATA_DIR = '.data/creator'

export function isCreatorModeEnabled(): boolean {
  return process.env.ELCANTO_CREATOR_MODE !== '0'
}

export function isLegacySynthesisMode(): boolean {
  return process.env.ELCANTO_LEGACY_MODE === '1'
}

export const CREATOR_INDEX_BATCH_SIZE = Number(process.env.CREATOR_INDEX_BATCH_SIZE ?? '5') || 5

export const DEMO_USER_ID = 'demo-creator-user'
export const DEMO_CHANNEL_ID = 'demo-channel-ai-bubble'
