/** Dev/admin tools (acceptance dashboard, debug APIs). */
export function isDevToolsAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ELCANTO_DEV_TOOLS === '1'
}

/** Direct synthesis experiment compare UI (dev-only, not production default). */
export function isDirectSynthesisExperimentAllowed(): boolean {
  if (!isDevToolsAllowed()) return false
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.ELCANTO_DIRECT_SYNTHESIS_EXPERIMENT === '1'
  )
}
