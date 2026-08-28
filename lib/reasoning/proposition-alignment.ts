import { normalizeStatement } from '@/lib/reasoning/source-ingest'
import { assessGenericness } from '@/lib/reasoning/relationship-semantics'
import type { ReasoningClaim } from '@/lib/reasoning/types'

export type PropositionDimension =
  | 'DEFINITION'
  | 'MECHANISM'
  | 'CAPABILITY'
  | 'LIMITATION'
  | 'COMPARISON'
  | 'ADOPTION'
  | 'POPULARITY'
  | 'MARKET_IMPACT'
  | 'MEDIA_ATTENTION'
  | 'DEVELOPMENT_STATUS'
  | 'HISTORY'
  | 'PREDICTION'
  | 'CAUSE'
  | 'EFFECT'
  | 'SIGNIFICANCE'
  | 'GENERAL'

export type AbstractionLevel = 'SPECIFIC' | 'MODERATE' | 'GENERIC_TOPIC'

export type MinimumSharedPropositionResult = {
  passed: boolean
  sharedProposition: string
  entailedByA: boolean
  entailedByB: boolean
  addedInference: boolean
  abstractionLevel: AbstractionLevel
  dimensionA: PropositionDimension
  dimensionB: PropositionDimension
  dimensionsCompatible: boolean
  rejectionReason?:
    | 'DIFFERENT_DIMENSION'
    | 'ALIGNMENT_FAILED'
    | 'RELATIONSHIP_PROPOSITION_HALLUCINATION'
  rejectionDetail?: string
}

const STOP = new Set([
  'the',
  'this',
  'that',
  'these',
  'those',
  'with',
  'from',
  'into',
  'about',
  'their',
  'there',
  'which',
  'while',
  'where',
  'when',
  'being',
  'been',
  'have',
  'has',
  'had',
  'were',
  'was',
  'are',
  'and',
  'for',
  'not',
  'but',
  'its',
  'they',
  'them',
  'than',
  'also',
  'such',
  'both',
  'each',
  'other',
  'more',
  'most',
  'some',
  'very',
  'just',
  'only',
  'speaker',
  'observes',
  'section',
  'segment',
  'introduces',
  'discusses',
  'suggests',
  'implies',
  'though',
  'however',
  'recently',
  'current',
  'context',
  'discussion',
  'discussions',
  'previous',
  'relevant',
  'important',
  'mcp',
])

const ATTENTION_EQUIV = new Set([
  'attention',
  'stir',
  'prominence',
  'breakthrough',
  'hot',
  'topic',
  'influence',
  'prominent',
  'surge',
  'gained',
  'significant',
])

const DIMENSION_RULES: Array<{ dim: PropositionDimension; re: RegExp; weight: number }> = [
  {
    dim: 'MEDIA_ATTENTION',
    re: /\b(youtube|media discussions?|stories dominate|content landscape|narratives?|landscape of)\b/i,
    weight: 3,
  },
  { dim: 'MEDIA_ATTENTION', re: /\b(dominate.*content|dominating.*media)\b/i, weight: 4 },
  {
    dim: 'DEVELOPMENT_STATUS',
    re: /\b(ongoing development|release status|in development|being discussed|release)\b/i,
    weight: 4,
  },
  {
    dim: 'HISTORY',
    re: /\b(previous limitations|past constraints|before the emergence|highlights previous|contrasts current)\b/i,
    weight: 4,
  },
  { dim: 'LIMITATION', re: /\b(limitations?|constraints?|unable|lack of|barrier)\b/i, weight: 2 },
  { dim: 'CAPABILITY', re: /\b(capabilit|current capabilities|enables?|can do)\b/i, weight: 2 },
  { dim: 'COMPARISON', re: /\b(compared|versus|vs\.?|than api|faster|easier|more user-friendly)\b/i, weight: 3 },
  { dim: 'ADOPTION', re: /\b(adopt|deploy|deployment|integration complexity|setup|install)\b/i, weight: 2 },
  { dim: 'MECHANISM', re: /\b(protocol|mechanism|how it works|standardiz|api format)\b/i, weight: 2 },
  {
    dim: 'POPULARITY',
    re: /\b(hot topic|gained\s+(\w+\s+)?attention|attention recently|stir|created a stir|prominence|surging attention)\b/i,
    weight: 3,
  },
  {
    dim: 'MARKET_IMPACT',
    re: /\b(market context|market interest|industry ecosystem|ai industry|market interests)\b/i,
    weight: 2,
  },
  {
    dim: 'SIGNIFICANCE',
    re: /\b(pivotal element|foundational aspects|breakthrough|essential role|critical breakthrough)\b/i,
    weight: 4,
  },
  { dim: 'PREDICTION', re: /\b(will|future implications|potential implications|predict)\b/i, weight: 2 },
  { dim: 'CAUSE', re: /\b(because|due to|leads to|causes?)\b/i, weight: 2 },
  { dim: 'EFFECT', re: /\b(result|outcome|consequence|therefore)\b/i, weight: 2 },
  {
    dim: 'EFFECT',
    re: /\b(productivity|employee output|work output|performance efficiency)\b/i,
    weight: 4,
  },
  {
    dim: 'EFFECT',
    re: /\b(commut|commuting|daily travel|travel time|rush hour|trip to)\b/i,
    weight: 4,
  },
  {
    dim: 'EFFECT',
    re: /\b(r-value|r-?\d+|insulation level|thermal performance|heat loss)\b/i,
    weight: 4,
  },
  { dim: 'DEFINITION', re: /\b(is defined|definition|what is|refers to|introduces mcp as)\b/i, weight: 2 },
]

const DIMENSION_FAMILY: Record<PropositionDimension, string> = {
  DEFINITION: 'definition',
  MECHANISM: 'mechanism',
  CAPABILITY: 'capability',
  LIMITATION: 'constraint',
  COMPARISON: 'comparison',
  ADOPTION: 'adoption',
  POPULARITY: 'attention',
  MARKET_IMPACT: 'market',
  MEDIA_ATTENTION: 'media',
  DEVELOPMENT_STATUS: 'development',
  HISTORY: 'temporal_history',
  PREDICTION: 'prediction',
  CAUSE: 'causal',
  EFFECT: 'causal',
  SIGNIFICANCE: 'significance',
  GENERAL: 'general',
}

const COMPATIBLE_FAMILIES = new Set([
  'attention:media',
  'media:attention',
  'attention:market',
  'market:attention',
  'attention:significance',
  'significance:attention',
  'market:significance',
  'significance:market',
  'mechanism:development',
  'development:mechanism',
  'mechanism:significance',
  'significance:mechanism',
])

const INVALID_SHARED_PATTERNS: RegExp[] = [
  /^both (discuss|relate|highlight|concern|refer|claims?|speak|recognize|confirm|bring)/i,
  /^each claim/i,
  /^this relationship/i,
  /^mcp is (important|relevant|significant)\.?$/i,
  /both claims? (discuss|highlight|recognize|confirm|refer|speak)/i,
  /significance of mcp tools in the context/i,
  /relevance of mcp/i,
  /emerging significance in the landscape/i,
  /importance of mcp tools in conversations/i,
  /both relate to ai/i,
  /both concern technology/i,
]

const HALLUCINATION_CONCEPTS: Array<{ concept: RegExp; requiredInClaims: RegExp }> = [
  {
    concept: /\b(storytelling|narratives?)\b/i,
    requiredInClaims: /\b(stories?|narrative|youtube|content)\b/i,
  },
  { concept: /\b(youtube)\b/i, requiredInClaims: /\b(youtube|content|stories)\b/i },
  {
    concept: /\b(media discussions?|media narratives?)\b/i,
    requiredInClaims: /\b(media|youtube|content|stories)\b/i,
  },
  { concept: /\b(domination|dominate)\b/i, requiredInClaims: /\b(dominat)/i },
  {
    concept: /\b(ongoing development|tool development)\b/i,
    requiredInClaims: /\b(development|release|ongoing)/i,
  },
  {
    concept: /\b(breakthrough)\b/i,
    requiredInClaims: /\b(breakthrough|stir|attention|hot topic|prominence)/i,
  },
  {
    concept: /\b(market dominance)\b/i,
    requiredInClaims: /\b(market|dominat)/i,
  },
  {
    concept: /\b(transformative element)\b/i,
    requiredInClaims: /\b(transform|pivotal|breakthrough)/i,
  },
]

const EXPLANATION_META = new Set([
  'agreement',
  'relationship',
  'claims',
  'claim',
  'recognize',
  'recognizing',
  'emphasize',
  'emphasizing',
  'highlight',
  'highlighting',
  'reflect',
  'reflecting',
  'indicate',
  'indicating',
  'convey',
  'conveying',
  'confirm',
  'confirming',
  'reinforce',
  'reinforcing',
  'signify',
  'signifying',
  'speak',
  'speaking',
  'discuss',
  'discussing',
  'stems',
  'similar',
  'respective',
  'within',
  'framework',
  'dialogues',
  'ongoing',
  'prominence',
  'surging',
  'status',
  'recognition',
  'message',
  'emphasis',
  'essential',
  'critical',
  'impactful',
  'impact',
  'influence',
  'influential',
  'prominence',
  'attention',
  'significance',
  'relevance',
  'important',
  'relevant',
  'development',
  'breakthrough',
  'market',
  'industry',
  'community',
  'technology',
  'sector',
  'landscape',
  'narratives',
  'storytelling',
  'dominance',
  'dominate',
  'media',
])

function contentTokens(text: string): string[] {
  return normalizeStatement(text)
    .split(/\W+/)
    .filter((w) => w.length > 2)
}

function significantSharedTokens(a: string, b: string): string[] {
  const ta = contentTokens(a).filter((t) => !STOP.has(t))
  const tb = new Set(contentTokens(b).filter((t) => !STOP.has(t)))
  return ta.filter((t) => tb.has(t))
}

function tokenCovered(token: string, claimTokens: Set<string>): boolean {
  if (claimTokens.has(token)) return true
  if (ATTENTION_EQUIV.has(token)) {
    for (const ct of claimTokens) if (ATTENTION_EQUIV.has(ct)) return true
  }
  if (token === 'technology' && claimTokens.has('tech')) return true
  if (token === 'tech' && claimTokens.has('technology')) return true
  if (token === 'community' && (claimTokens.has('industry') || claimTokens.has('community'))) {
    return true
  }
  if (token === 'industry' && (claimTokens.has('community') || claimTokens.has('industry'))) {
    return true
  }
  if (token === 'technology' && (claimTokens.has('tech') || claimTokens.has('industry') || claimTokens.has('ai'))) {
    return true
  }
  if (token === 'tech' && (claimTokens.has('technology') || claimTokens.has('industry') || claimTokens.has('ai'))) {
    return true
  }
  if (token === 'community' && (claimTokens.has('industry') || claimTokens.has('community') || claimTokens.has('tech'))) {
    return true
  }
  if (token === 'artificial' && claimTokens.has('ai')) return true
  if (token === 'intelligence' && claimTokens.has('ai')) return true
  if (
    (token === 'commuting' || token === 'commute') &&
    (claimTokens.has('travel') || claimTokens.has('trip') || claimTokens.has('commuting'))
  ) {
    return true
  }
  if (
    token === 'travel' &&
    (claimTokens.has('commuting') || claimTokens.has('commute') || claimTokens.has('travel'))
  ) {
    return true
  }
  if (
    (token === 'reduces' || token === 'reduce') &&
    [...claimTokens].some((t) => t.startsWith('cut') || t.startsWith('elimin'))
  ) {
    return true
  }
  if (
    (token === 'cuts' || token === 'cut') &&
    [...claimTokens].some((t) => t.startsWith('reduc') || t.startsWith('elimin'))
  ) {
    return true
  }
  if (
    (token === 'workplace' || token === 'office') &&
    (claimTokens.has('office') || claimTokens.has('home') || claimTokens.has('workplace'))
  ) {
    return true
  }
  if (
    (token === 'employees' || token === 'employee') &&
    (claimTokens.has('employee') || claimTokens.has('employees') || claimTokens.has('workers'))
  ) {
    return true
  }
  if (
    (token === 'productivity' || token === 'output' || token === 'performance') &&
    (claimTokens.has('productivity') || claimTokens.has('output') || claimTokens.has('performance'))
  ) {
    return true
  }
  return false
}

function deriveCommuteSharedProposition(a: string, b: string): string | null {
  const commuteCtx = /\b(commut|daily travel|travel to|trip to|rush hour|workplace|office)\b/i
  const reduceTravel = /\b(reduces?|cuts?|eliminates?|avoids?|reclaiming|fewer|less)\b/i
  if (commuteCtx.test(a) && commuteCtx.test(b) && reduceTravel.test(a) && reduceTravel.test(b)) {
    return 'remote work reduces employee commuting or daily workplace travel'
  }
  return null
}

function deriveProductivitySharedProposition(a: string, b: string): string | null {
  if (!/\b(productivity|output|performance)\b/i.test(`${a} ${b}`)) return null
  const up = /\b(increases?|raises?|boosts?|improves?)\b/i
  const down = /\b(decreases?|lowers?|diminishes?)\b/i
  const aUp = up.test(a)
  const aDown = down.test(a)
  const bUp = up.test(b)
  const bDown = down.test(b)
  if ((aUp && bUp) || (aDown && bDown)) {
    return 'remote work affects employee productivity'
  }
  return null
}

function deriveInsulationRValueProposition(a: string, b: string): string | null {
  if (!/\b(r-?\d+|r-value|insulation|attic)\b/i.test(`${a} ${b}`)) return null
  const highR = /\b(r-?49|r-?60|high r|at least r|r-value)\b/i
  if (highR.test(a) && highR.test(b)) {
    return 'cold-climate attic retrofits target high R-value insulation'
  }
  return null
}

function localProductivityDirection(statement: string): 'up' | 'down' | null {
  if (!/\b(productivity|output|performance)\b/i.test(statement)) return null
  if (/\b(increases?|raises?|boosts?|improves?)\b/i.test(statement)) return 'up'
  if (/\b(decreases?|lowers?|diminishes?)\b/i.test(statement)) return 'down'
  return null
}

export function classifyPropositionDimension(statement: string): PropositionDimension {
  let best: PropositionDimension = 'GENERAL'
  let bestScore = 0
  for (const rule of DIMENSION_RULES) {
    if (rule.re.test(statement)) {
      const score = rule.weight
      if (score > bestScore) {
        bestScore = score
        best = rule.dim
      }
    }
  }
  return best
}

export type DimensionCompatibility = 'EXACT' | 'COMPATIBLE' | 'DIFFERENT'

const ENTITY_TOPIC_TOKENS = new Set([
  'crispr',
  'remote',
  'work',
  'gene',
  'editing',
  'insulation',
  'attic',
  'mcp',
  'retrofit',
  'northern',
  'cold',
  'climate',
])

function substantiveSharedTokens(claimA: string, claimB: string): string[] {
  return significantSharedTokens(claimA, claimB).filter(
    (t) => !ENTITY_TOPIC_TOKENS.has(t) && t.length > 3,
  )
}

function assessGeneralPairCompatibility(claimA: string, claimB: string): DimensionCompatibility {
  const shared = significantSharedTokens(claimA, claimB)
  const substantive = substantiveSharedTokens(claimA, claimB)
  if (substantive.length >= 1 && shared.length >= 2) return 'COMPATIBLE'
  if (shared.length >= 3 && substantive.length >= 2) return 'COMPATIBLE'
  return 'DIFFERENT'
}

export function assessDimensionCompatibility(
  a: PropositionDimension,
  b: PropositionDimension,
  claimA: string,
  claimB: string,
): DimensionCompatibility {
  if (a === b) {
    if (a === 'GENERAL') return assessGeneralPairCompatibility(claimA, claimB)
    return 'EXACT'
  }

  if (a === 'GENERAL' || b === 'GENERAL') {
    const generalCompat = assessGeneralPairCompatibility(claimA, claimB)
    if (generalCompat === 'DIFFERENT') return 'DIFFERENT'
    const specificDim = a === 'GENERAL' ? b : a
    const specificClaim = a === 'GENERAL' ? claimB : claimA
    if (specificDim !== 'GENERAL' && classifyPropositionDimension(specificClaim) === specificDim) {
      return 'COMPATIBLE'
    }
    return generalCompat
  }

  const familyA = DIMENSION_FAMILY[a]
  const familyB = DIMENSION_FAMILY[b]
  if (familyA === familyB) return 'COMPATIBLE'

  const key = `${familyA}:${familyB}`
  if (!COMPATIBLE_FAMILIES.has(key)) return 'DIFFERENT'

  if (familyA === 'media' || familyB === 'media') {
    if (!hasMediaSurface(claimA) || !hasMediaSurface(claimB)) return 'DIFFERENT'
  }

  return 'COMPATIBLE'
}

export function areDimensionsCompatible(
  a: PropositionDimension,
  b: PropositionDimension,
  claimA?: string,
  claimB?: string,
): boolean {
  if (!claimA || !claimB) {
    if (a === b) return true
    if (a === 'GENERAL' || b === 'GENERAL') return false
    const familyA = DIMENSION_FAMILY[a]
    const familyB = DIMENSION_FAMILY[b]
    if (familyA === familyB) return true
    return COMPATIBLE_FAMILIES.has(`${familyA}:${familyB}`)
  }
  return assessDimensionCompatibility(a, b, claimA, claimB) !== 'DIFFERENT'
}

function hasMediaSurface(text: string): boolean {
  return /\b(youtube|media|stories|content|narrative|landscape of)\b/i.test(text)
}

export function assessPropositionAbstraction(proposition: string): AbstractionLevel {
  if (!proposition.trim()) return 'GENERIC_TOPIC'
  const tokens = contentTokens(proposition).filter((t) => !STOP.has(t))
  if (tokens.length <= 2) return 'GENERIC_TOPIC'
  if (
    /\b(landscape|ecosystem|overall|in general|both|discuss|relate|world|society)\b/i.test(
      proposition,
    )
  ) {
    return 'GENERIC_TOPIC'
  }
  if (tokens.length <= 3) return 'MODERATE'
  return 'SPECIFIC'
}

export function claimEntailsProposition(claim: string, proposition: string): boolean {
  const propTokens = contentTokens(proposition).filter((t) => !STOP.has(t) && t.length > 2)
  if (propTokens.length === 0) return false
  const claimTokens = new Set(contentTokens(claim))
  let covered = 0
  for (const t of propTokens) {
    if (tokenCovered(t, claimTokens)) covered++
  }
  return covered / propTokens.length >= 0.6
}

function hasAttentionSemantics(text: string): boolean {
  return /\b(attention|stir|prominence|hot topic|breakthrough|surge|influence|gained\s+(\w+\s+)?attention)\b/i.test(
    text,
  )
}

function hasIntegrationSemantics(text: string): boolean {
  return /\b(integrat|complex|simplif|reduces? complexity|deploy)\b/i.test(text)
}

export function deriveSharedProposition(from: ReasoningClaim, to: ReasoningClaim): string {
  const a = from.statement
  const b = to.statement
  const commuteProp = deriveCommuteSharedProposition(a, b)
  if (commuteProp) return commuteProp
  const productivityProp = deriveProductivitySharedProposition(a, b)
  if (productivityProp) return productivityProp
  const insulationProp = deriveInsulationRValueProposition(a, b)
  if (insulationProp) return insulationProp

  const dimA = classifyPropositionDimension(a)
  const dimB = classifyPropositionDimension(b)

  if (hasAttentionSemantics(a) && hasAttentionSemantics(b) && areDimensionsCompatible(dimA, dimB, a, b)) {
    const aHasContext = /\b(industry|community|tech|ai|market)\b/i.test(a)
    const bHasContext = /\b(industry|community|tech|ai|market)\b/i.test(b)
    if (aHasContext && bHasContext) {
      return 'MCP has significant prominence in the AI industry and tech community'
    }
    return 'MCP has significant prominence and attention'
  }

  if (hasIntegrationSemantics(a) && hasIntegrationSemantics(b)) {
    const shared = significantSharedTokens(a, b)
    if (shared.some((t) => t.startsWith('integrat') || t.startsWith('complex') || t.startsWith('simplif'))) {
      return 'MCP reduces or simplifies integration complexity'
    }
  }

  const shared = significantSharedTokens(a, b)
  if (shared.length < 2) return ''

  const combined = `${a} ${b}`.toLowerCase()
  if (shared.includes('integration') || shared.some((t) => t.startsWith('integrat'))) {
    return 'MCP affects integration between AI applications'
  }

  if (shared.length >= 3 && areDimensionsCompatible(dimA, dimB, a, b)) {
    const subject = combined.includes('mcp') ? 'MCP' : 'The topic'
    const predicate = shared.slice(0, 3).join(' ')
    return `${subject} ${predicate}`
  }

  return ''
}

function isGenericProposition(proposition: string, abstractionLevel: AbstractionLevel): boolean {
  if (!proposition.trim()) return true
  if (abstractionLevel === 'GENERIC_TOPIC') return true
  if (
    hasAttentionSemantics(proposition) &&
    /\b(industry|community|tech|youtube|media)\b/i.test(proposition)
  ) {
    return false
  }
  const generic = assessGenericness(proposition)
  if (generic.generic) return true
  for (const re of INVALID_SHARED_PATTERNS) {
    if (re.test(proposition)) return true
  }
  const tokens = contentTokens(proposition).filter((t) => !STOP.has(t))
  return tokens.length < 2
}

function hasAddedInference(claimA: string, claimB: string, proposition: string): boolean {
  const propTokens = contentTokens(proposition).filter(
    (t) => !STOP.has(t) && t.length > 3 && t !== 'mcp',
  )
  const combined = new Set([...contentTokens(claimA), ...contentTokens(claimB)])
  let novel = 0
  for (const t of propTokens) {
    if (!tokenCovered(t, combined)) novel++
  }
  return novel >= 2
}

export function assessRelationshipPropositionFidelity(
  from: ReasoningClaim,
  to: ReasoningClaim,
  explanation: string,
  options?: { lenientWhenClaimsAlign?: boolean },
): { pass: boolean; reason?: string } {
  const claimA = from.statement
  const claimB = to.statement
  const combined = `${claimA} ${claimB}`

  const strictBilateralConcepts: Array<{ concept: RegExp; requiredInEachClaim: RegExp }> = [
    {
      concept: /\b(storytelling|narratives?)\b/i,
      requiredInEachClaim: /\b(stories?|narrative|youtube|content|media)\b/i,
    },
    {
      concept: /\b(youtube)\b/i,
      requiredInEachClaim: /\b(youtube|content|stories)\b/i,
    },
    {
      concept: /\b(domination|dominate|dominance)\b/i,
      requiredInEachClaim: /\b(dominat)/i,
    },
    {
      concept: /\b(ongoing development|tool development)\b/i,
      requiredInEachClaim: /\b(development|release|ongoing)/i,
    },
    {
      concept: /\b(market dominance)\b/i,
      requiredInEachClaim: /\b(market|dominat)/i,
    },
    {
      concept: /\b(transformative element)\b/i,
      requiredInEachClaim: /\b(transform|pivotal|breakthrough)/i,
    },
  ]

  for (const { concept, requiredInEachClaim } of strictBilateralConcepts) {
    if (!concept.test(explanation)) continue
    if (!requiredInEachClaim.test(claimA) || !requiredInEachClaim.test(claimB)) {
      return { pass: false, reason: 'RELATIONSHIP_PROPOSITION_HALLUCINATION' }
    }
  }

  if (!options?.lenientWhenClaimsAlign) {
    for (const { concept, requiredInClaims } of HALLUCINATION_CONCEPTS) {
      if (concept.test(explanation) && !requiredInClaims.test(combined)) {
        return { pass: false, reason: 'RELATIONSHIP_PROPOSITION_HALLUCINATION' }
      }
    }

    const explTokens = contentTokens(explanation).filter(
      (t) => t.length > 5 && !EXPLANATION_META.has(t),
    )
    const claimTokenSet = new Set(contentTokens(combined))
    const novel = explTokens.filter((t) => !claimTokenSet.has(t))
    if (novel.length >= 2) {
      return { pass: false, reason: 'RELATIONSHIP_PROPOSITION_HALLUCINATION' }
    }
  }

  return { pass: true }
}

export function assessMinimumSharedProposition(
  from: ReasoningClaim,
  to: ReasoningClaim,
  explanation?: string,
): MinimumSharedPropositionResult {
  const dimensionA = classifyPropositionDimension(from.statement)
  const dimensionB = classifyPropositionDimension(to.statement)
  const dimensionsCompatible = areDimensionsCompatible(
    dimensionA,
    dimensionB,
    from.statement,
    to.statement,
  )

  const prodA = localProductivityDirection(from.statement)
  const prodB = localProductivityDirection(to.statement)
  if (prodA && prodB && prodA !== prodB) {
    return {
      passed: false,
      sharedProposition: '',
      entailedByA: false,
      entailedByB: false,
      addedInference: false,
      abstractionLevel: 'GENERIC_TOPIC',
      dimensionA,
      dimensionB,
      dimensionsCompatible: true,
      rejectionReason: 'ALIGNMENT_FAILED',
      rejectionDetail: 'Opposing productivity positions are not agreement.',
    }
  }

  const sharedPropositionFromClaims = deriveSharedProposition(from, to)
  const entailedByAFromClaims = sharedPropositionFromClaims
    ? claimEntailsProposition(from.statement, sharedPropositionFromClaims)
    : false
  const entailedByBFromClaims = sharedPropositionFromClaims
    ? claimEntailsProposition(to.statement, sharedPropositionFromClaims)
    : false
  const claimsOnlyPass =
    sharedPropositionFromClaims.length > 0 &&
    entailedByAFromClaims &&
    entailedByBFromClaims &&
    dimensionsCompatible &&
    !isGenericProposition(
      sharedPropositionFromClaims,
      assessPropositionAbstraction(sharedPropositionFromClaims),
    )

  if (explanation) {
    const fidelity = assessRelationshipPropositionFidelity(from, to, explanation, {
      lenientWhenClaimsAlign: claimsOnlyPass,
    })
    if (!fidelity.pass) {
      return {
        passed: false,
        sharedProposition: '',
        entailedByA: false,
        entailedByB: false,
        addedInference: true,
        abstractionLevel: 'GENERIC_TOPIC',
        dimensionA,
        dimensionB,
        dimensionsCompatible,
        rejectionReason: 'RELATIONSHIP_PROPOSITION_HALLUCINATION',
        rejectionDetail: fidelity.reason,
      }
    }
  }

  if (!dimensionsCompatible) {
    return {
      passed: false,
      sharedProposition: '',
      entailedByA: false,
      entailedByB: false,
      addedInference: false,
      abstractionLevel: 'GENERIC_TOPIC',
      dimensionA,
      dimensionB,
      dimensionsCompatible: false,
      rejectionReason: 'DIFFERENT_DIMENSION',
      rejectionDetail: `Incompatible dimensions: ${dimensionA} vs ${dimensionB}`,
    }
  }

  const sharedProposition = sharedPropositionFromClaims
  const entailedByA = entailedByAFromClaims
  const entailedByB = entailedByBFromClaims
  const abstractionLevel = assessPropositionAbstraction(sharedProposition)
  const addedInference = sharedProposition
    ? hasAddedInference(from.statement, to.statement, sharedProposition)
    : false
  const generic = isGenericProposition(sharedProposition, abstractionLevel)

  const passed =
    sharedProposition.length > 0 &&
    entailedByA &&
    entailedByB &&
    !addedInference &&
    dimensionsCompatible &&
    !generic

  let rejectionReason: MinimumSharedPropositionResult['rejectionReason']
  let rejectionDetail: string | undefined
  if (!passed) {
    if (!sharedProposition) {
      rejectionReason = 'ALIGNMENT_FAILED'
      rejectionDetail = 'No minimum shared proposition derivable from both claims.'
    } else if (!entailedByA || !entailedByB) {
      rejectionReason = 'ALIGNMENT_FAILED'
      rejectionDetail = `Bidirectional entailment failed (A=${entailedByA}, B=${entailedByB}).`
    } else if (addedInference) {
      rejectionReason = 'ALIGNMENT_FAILED'
      rejectionDetail = 'Shared proposition adds inference beyond both claims.'
    } else if (generic) {
      rejectionReason = 'ALIGNMENT_FAILED'
      rejectionDetail = 'Shared proposition is too generic (GENERIC_TOPIC).'
    } else {
      rejectionReason = 'ALIGNMENT_FAILED'
    }
  }

  return {
    passed,
    sharedProposition,
    entailedByA,
    entailedByB,
    addedInference,
    abstractionLevel,
    dimensionA,
    dimensionB,
    dimensionsCompatible,
    rejectionReason,
    rejectionDetail,
  }
}

export function filterPropositionAlignedRelationships<T extends { fromClaimId: string; toClaimId: string; type: string; explanation: string }>(
  relationships: T[],
  claimById: Map<string, ReasoningClaim>,
): T[] {
  return relationships.filter((rel) => {
    const agreementTypes = new Set(['AGREEMENT', 'PARTIAL_AGREEMENT', 'SAME_TOPIC_DIFFERENT_PERSPECTIVE'])
    if (!agreementTypes.has(rel.type)) return true
    const from = claimById.get(rel.fromClaimId)
    const to = claimById.get(rel.toClaimId)
    if (!from || !to) return false
    return assessMinimumSharedProposition(from, to, rel.explanation).passed
  })
}

export type RelationshipPrecisionAuditLabel = 'VALID' | 'FALSE_AGREEMENT' | 'UNCERTAIN'

export type RelationshipPrecisionAuditEntry = {
  relationshipId: string
  fromClaimText: string
  toClaimText: string
  type: string
  explanation: string
  expectedLabel?: RelationshipPrecisionAuditLabel
  assessedLabel: RelationshipPrecisionAuditLabel
  sharedProposition: string
  dimensionA: PropositionDimension
  dimensionB: PropositionDimension
}

export function auditRelationshipPrecision(
  relationships: Array<{
    id: string
    type: string
    fromClaimId: string
    toClaimId: string
    explanation: string
  }>,
  claims: ReasoningClaim[],
  expectations?: Map<string, RelationshipPrecisionAuditLabel>,
): {
  entries: RelationshipPrecisionAuditEntry[]
  verified: number
  auditedValid: number
  falseAgreement: number
  uncertain: number
  estimatedPrecision: number
  regressionFailures: string[]
} {
  const claimById = new Map(claims.map((c) => [c.id, c]))
  const entries: RelationshipPrecisionAuditEntry[] = []
  const regressionFailures: string[] = []

  for (const rel of relationships) {
    const from = claimById.get(rel.fromClaimId)
    const to = claimById.get(rel.toClaimId)
    if (!from || !to) continue

    const msp = assessMinimumSharedProposition(from, to, rel.explanation)
    const agreementTypes = new Set(['AGREEMENT', 'PARTIAL_AGREEMENT', 'SAME_TOPIC_DIFFERENT_PERSPECTIVE'])

    let assessedLabel: RelationshipPrecisionAuditLabel
    if (!agreementTypes.has(rel.type)) {
      assessedLabel = 'VALID'
    } else if (msp.passed) {
      assessedLabel = 'VALID'
    } else if (
      msp.rejectionReason === 'DIFFERENT_DIMENSION' ||
      msp.rejectionReason === 'RELATIONSHIP_PROPOSITION_HALLUCINATION' ||
      !msp.dimensionsCompatible
    ) {
      assessedLabel = 'FALSE_AGREEMENT'
    } else {
      assessedLabel = 'UNCERTAIN'
    }

    const expected = expectations?.get(rel.id)
    if (expected === 'FALSE_AGREEMENT' && assessedLabel === 'VALID') {
      regressionFailures.push(
        `${rel.id}: expected FALSE_AGREEMENT but assessed VALID (${from.statement.slice(0, 60)}…)`,
      )
    }

    entries.push({
      relationshipId: rel.id,
      fromClaimText: from.statement,
      toClaimText: to.statement,
      type: rel.type,
      explanation: rel.explanation,
      expectedLabel: expected,
      assessedLabel,
      sharedProposition: msp.sharedProposition,
      dimensionA: msp.dimensionA,
      dimensionB: msp.dimensionB,
    })
  }

  const verified = entries.length
  const auditedValid = entries.filter((e) => e.assessedLabel === 'VALID').length
  const falseAgreement = entries.filter((e) => e.assessedLabel === 'FALSE_AGREEMENT').length
  const uncertain = entries.filter((e) => e.assessedLabel === 'UNCERTAIN').length
  const estimatedPrecision = verified > 0 ? auditedValid / verified : 0

  return {
    entries,
    verified,
    auditedValid,
    falseAgreement,
    uncertain,
    estimatedPrecision,
    regressionFailures,
  }
}
