import type {
  DirectEvidenceRef,
  DirectSourceAnswer,
  DirectSynthesisPayload,
  DirectValidationSummary,
  EvidenceValidationStatus,
} from '@/lib/experiments/direct-synthesis/types'

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function evidenceExists(ref: string, catalog: Map<string, DirectEvidenceRef>): boolean {
  return catalog.has(ref)
}

function textSupportedByEvidence(text: string, refs: string[], catalog: Map<string, DirectEvidenceRef>): EvidenceValidationStatus {
  if (refs.length === 0) return 'UNSUPPORTED'
  const norm = normalize(text)
  let best = 0
  for (const ref of refs) {
    const ev = catalog.get(ref)
    if (!ev) continue
    const evNorm = normalize(ev.text)
    if (evNorm.includes(norm.slice(0, Math.min(40, norm.length))) || norm.includes(evNorm.slice(0, 40))) {
      return 'SUPPORTED'
    }
    const words = norm.split(' ').filter((w) => w.length > 4)
    const hits = words.filter((w) => evNorm.includes(w)).length
    best = Math.max(best, hits / Math.max(words.length, 1))
  }
  if (best >= 0.35) return 'PARTIAL'
  return 'UNSUPPORTED'
}

export function validateDirectSynthesis(input: {
  sourceAnswers: DirectSourceAnswer[]
  synthesis: DirectSynthesisPayload
  evidenceCatalog: DirectEvidenceRef[]
}): DirectValidationSummary {
  const catalog = new Map(input.evidenceCatalog.map((e) => [e.ref, e]))
  const hallucinationFlags: string[] = []

  let agreementSupported = 0
  let agreementUnsupported = 0
  const filteredAgreements: DirectSynthesisPayload['agreements'] = []

  for (const ag of input.synthesis.agreements) {
    const validRefs = ag.evidenceRefs.filter((r) => evidenceExists(r, catalog))
    if (validRefs.length !== ag.evidenceRefs.length) {
      hallucinationFlags.push(`agreement_invalid_ref:${ag.statement.slice(0, 40)}`)
    }
    const status = textSupportedByEvidence(ag.statement, validRefs, catalog)
    if (status === 'SUPPORTED' || status === 'PARTIAL') {
      agreementSupported++
      filteredAgreements.push({ ...ag, evidenceRefs: validRefs })
    } else {
      agreementUnsupported++
    }
  }

  let disagreementSupported = 0
  let disagreementUnsupported = 0
  const filteredDisagreements: DirectSynthesisPayload['disagreements'] = []

  for (const d of input.synthesis.disagreements) {
    const positions = d.positions.filter((p) => {
      const refs = p.evidenceRefs.filter((r) => evidenceExists(r, catalog))
      const status = textSupportedByEvidence(p.position, refs, catalog)
      return status === 'SUPPORTED' || status === 'PARTIAL'
    })
    if (positions.length >= 2) {
      disagreementSupported++
      filteredDisagreements.push({ ...d, positions })
    } else {
      disagreementUnsupported++
      hallucinationFlags.push(`disagreement_unsupported:${d.issue.slice(0, 40)}`)
    }
  }

  let complementarySupported = 0
  let complementaryUnsupported = 0
  const filteredComplementary: DirectSynthesisPayload['complementaryViews'] = []

  for (const c of input.synthesis.complementaryViews) {
    const validRefs = c.evidenceRefs.filter((r) => evidenceExists(r, catalog))
    const status = textSupportedByEvidence(c.statement, validRefs, catalog)
    if (status === 'SUPPORTED' || status === 'PARTIAL') {
      complementarySupported++
      filteredComplementary.push({ ...c, evidenceRefs: validRefs })
    } else {
      complementaryUnsupported++
    }
  }

  let sourcePositionSupported = 0
  let sourcePositionUnsupported = 0
  for (const a of input.sourceAnswers) {
    if (!a.position) continue
    const refs = a.evidence.map((e) => e.evidenceRef)
    const status = textSupportedByEvidence(a.position, refs, catalog)
    if (status === 'SUPPORTED' || status === 'PARTIAL') sourcePositionSupported++
    else {
      sourcePositionUnsupported++
      hallucinationFlags.push(`source_position_unsupported:${a.sourceId}`)
    }
  }

  return {
    agreementSupported,
    agreementUnsupported,
    disagreementSupported,
    disagreementUnsupported,
    complementarySupported,
    complementaryUnsupported,
    sourcePositionSupported,
    sourcePositionUnsupported,
    hallucinationFlags,
    filteredAgreements,
    filteredDisagreements,
    filteredComplementary,
  }
}
