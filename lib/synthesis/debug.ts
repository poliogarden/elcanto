export function isSynthesisDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SYNTHESIS_DEBUG === 'true'
}
