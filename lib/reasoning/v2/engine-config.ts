/** Reasoning V2 reliability track — frozen V1 baseline remains at reasoning-v2.1 / commit 70ea277. */
export const REASONING_V2_ENGINE_VERSION = 'reasoning-v2.2'

/** Max recovery extraction attempts per source (primary + one retry). */
export const EXTRACTION_RECOVERY_MAX_ATTEMPTS = 2

/**
 * Extraction/coverage LLM steps use low temperature for structural stability.
 * Relationship verification may use model defaults where semantic judgment is required.
 */
export const EXTRACTION_LLM_TEMPERATURE = 0.1
