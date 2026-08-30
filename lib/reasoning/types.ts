import type { LandscapeCard } from '@/lib/survival/types'

export type ConfidenceLevel = 'strong' | 'moderate' | 'weak'
export type CategoricalConfidence = 'high' | 'moderate' | 'low'
export type VerificationStatus = 'SUPPORTED' | 'WEAK' | 'REJECTED'

export type ReasoningRelationshipType =
  | 'AGREEMENT'
  | 'CONTRADICTION'
  | 'TENSION'
  | 'COMPLEMENTARY'
  | 'CAUSE_EFFECT'
  | 'DEPENDENCY'
  | 'SAME_TOPIC_DIFFERENT_PERSPECTIVE'
  | 'PARTIAL_AGREEMENT'
  | 'INDEPENDENT'
  | 'PROBLEM_SOLUTION'
  | 'MECHANISM_OUTCOME'
  | 'TRADE_OFF'
  | 'PREREQUISITE'
  | 'CONSTRAINT'
  | 'ADOPTION_BARRIER'
  | 'ENABLER'
  | 'EXAMPLE_OF'
  | 'GENERALIZATION'
  | 'SPECIALIZATION'
  | 'TEMPORAL_PROGRESSION'

export type DiscoveryLevel =
  | 'DIRECT_MATCH'
  | 'SEMANTIC_RELATIONSHIP'
  | 'CROSS_SOURCE_INFERENCE'

export type RejectionReason =
  | 'TOPIC_ONLY'
  | 'INSUFFICIENT_EVIDENCE'
  | 'DIFFERENT_DIMENSION'
  | 'LOGICAL_GAP'
  | 'SAME_SOURCE_ONLY'
  | 'DUPLICATE'
  | 'LOW_RELEVANCE'
  | 'UNSUPPORTED_INFERENCE'
  | 'ALIGNMENT_FAILED'
  | 'WEAK_CONFIDENCE'
  | 'KEYWORD_ONLY'
  | 'RELATIONSHIP_PROPOSITION_HALLUCINATION'

export type ClaimRole =
  | 'CORE_ARGUMENT'
  | 'SUPPORTING_ARGUMENT'
  | 'FACT'
  | 'EXAMPLE'
  | 'PROCEDURAL'
  | 'ANECDOTAL'
  | 'PREDICTION'
  | 'OPINION'
  | 'CONTEXT'

export type ClaimType =
  | 'factual'
  | 'interpretive'
  | 'predictive'
  | 'normative'
  | 'descriptive'

export type StructuredProposition = {
  subject?: string
  predicate?: string
  object?: string
  polarity?: 'positive' | 'negative' | 'neutral'
  qualifiers?: string[]
  conditions?: string[]
  scope?: string
}

export type StanceKind = 'supportive' | 'skeptical' | 'conditional' | 'neutral' | 'mixed'

export type ReasoningEvidence = {
  id: string
  sourceId: string
  videoId: string
  timestampStart: number
  timestampEnd: number | null
  text: string
  confidence: number
  segmentId?: string
}

export type ReasoningClaim = {
  id: string
  sourceId: string
  videoId: string
  voiceIndex: number
  statement: string
  normalizedStatement: string
  evidenceIds: string[]
  claimType: ClaimType
  confidence: ConfidenceLevel
  conceptIds: string[]
  role?: ClaimRole
  relevanceScore?: number
  structuredProposition?: StructuredProposition
  originalText?: string
  evidenceText?: string
  timestampStart?: number
  timestampEnd?: number | null
  rejectionReason?: string
  fidelityStatus?: import('@/lib/reasoning/claim-fidelity').ClaimFidelityStatus
  fidelityMutations?: import('@/lib/reasoning/claim-fidelity').ClaimMutationKind[]
  claimScope?: import('@/lib/reasoning/claim-fidelity').ClaimScope
  strength?: 'strong' | 'moderate' | 'weak'
  evidenceStrength?: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'
  comparisonEligibility?: 'ELIGIBLE' | 'LIMITED' | 'EXCLUDED'
  claimQualityClass?: 'FACTUAL' | 'INTERPRETIVE' | 'PREDICTIVE' | 'HYPE' | 'META' | 'RHETORICAL'
  evidenceSpans?: import('@/lib/reasoning/claim-evidence').ClaimEvidenceSpan[]
  evidenceStatus?: import('@/lib/reasoning/claim-evidence').ClaimEvidenceStatus
  reasoningEligible?: boolean
}

export type ReasoningConcept = {
  id: string
  label: string
  sourceIds: string[]
}

export type ReasoningStance = {
  id: string
  sourceId: string
  conceptId: string
  stance: StanceKind
  summary: string
}

export type ReasoningAssumption = {
  id: string
  sourceId: string
  statement: string
  origin: 'explicit' | 'inferred'
  confidence: ConfidenceLevel
  linkedClaimIds: string[]
}

export type SourceRelevanceClass =
  | 'direct'
  | 'supporting'
  | 'contrasting'
  | 'contextual'
  | 'weak'
  | 'off_topic'

export type SourceRelevance = {
  sourceId: string
  classification: SourceRelevanceClass
  score: number
  reason: string
  relevantClaimIds: string[]
}

export type ReasoningCluster = {
  id: string
  label: string
  centralQuestion: string
  sourceIds: string[]
  relevance: 'primary' | 'secondary' | 'off_topic'
}

export type ClaimAlignment = {
  fromClaimId: string
  toClaimId: string
  comparable: boolean
  sameSubject: boolean
  sameDimension: boolean
  sameAbstractionLevel: boolean
  reason: string
}

export type RelationshipCandidate = {
  fromClaimId: string
  toClaimId: string
  type: ReasoningRelationshipType
  rationale: string
  confidence: ConfidenceLevel
  discoveryLevel: DiscoveryLevel
  dimension?: string
  bridgeConcept?: string
}

export type ReasoningRelationship = {
  id: string
  type: ReasoningRelationshipType
  fromClaimId: string
  toClaimId: string
  fromSourceId: string
  toSourceId: string
  fromVideoId: string
  toVideoId: string
  explanation: string
  confidence: ConfidenceLevel
  verificationStatus: VerificationStatus
  rejectionReason?: RejectionReason | string
  discoveryLevel?: DiscoveryLevel
  dimension?: string
  reasoningBridge?: string
}

export type ReasoningPatternType =
  | 'recurring_driver'
  | 'shared_causal_mechanism'
  | 'trade_off'
  | 'polarization'
  | 'dependency'
  | 'adoption_barrier'
  | 'missing_variable'
  | 'temporal_shift'
  | 'different_definition'
  | 'different_evaluation_criterion'

export type ReasoningPattern = {
  id: string
  type: ReasoningPatternType
  title: string
  description: string
  relationshipIds: string[]
  claimIds: string[]
  sourceIds: string[]
  confidence: ConfidenceLevel
  verificationStatus: VerificationStatus
}

export type ReasoningSynthesisBlock = {
  statement: string
  explanation: string
  patternIds: string[]
  confidence: ConfidenceLevel
  verificationStatus: VerificationStatus
}

export type ReasoningJudgment = {
  statement: string
  whatIsSupported: string
  whatIsUncertain: string
  keyReason: string
  confidence: CategoricalConfidence
  missingEvidence: string[]
  verificationStatus: VerificationStatus
  reasoningSteps?: Array<{
    statement: string
    clusterIds: string[]
    claimIds: string[]
    sourceIds: string[]
  }>
  limitations?: string[]
  sourceCoverageNote?: string
  evidenceStrengthLabel?: string
  supportingSourceCount?: number
  totalAnalyzedSourceCount?: number
  coverageSummary?: string
}

export type EvidencePathStep = {
  step: 'claim' | 'relationship' | 'pattern' | 'inference'
  refId: string
  label: string
}

export type ReasoningInsightType =
  | 'combined_implication'
  | 'latent_tradeoff'
  | 'hidden_assumption'
  | 'new_hypothesis'
  | 'decision_rule'
  | 'future_implication'

export type ReasoningInsight = {
  id: string
  type: ReasoningInsightType
  statement: string
  explanation: string
  sourceIds: string[]
  claimIds: string[]
  relationshipIds: string[]
  patternIds: string[]
  evidencePath: EvidencePathStep[]
  confidence: CategoricalConfidence
  verificationStatus: VerificationStatus
  reasoningBridge?: string
  inferenceType?: string
  evidenceCoverage?: number
}

export type ReasoningKnowledgeGap = {
  id: string
  question: string
  whyItMatters: string
  linkedJudgmentAspect: string
}

export type SurvivalTestScores = {
  q1_crossSourceValue: boolean
  q2_newRelationships: boolean
  q3_beyondSummary: boolean
  q4_trueEmergent: boolean
  q5_tenSecondClarity: boolean
  q6_noForcedLinks: boolean
  q7_structurallyDifferent: boolean
  notes: string[]
}

export type PipelineStats = {
  sourcesCount: number
  inputSources?: number
  relevantSources?: number
  excludedSources?: number
  synthesizedSources?: number
  claimsExtracted: number
  relevantClaims: number
  acceptedClaims?: number
  rejectedClaims?: number
  duplicateClaimsMerged?: number
  candidatePairs: number
  directCandidates: number
  semanticCandidates: number
  inferenceCandidates: number
  bridgeCandidates?: number
  possibleCrossSourcePairs?: number
  participatingSourceCount?: number
  verifiedRelationships: number
  crossSourceVerifiedRelationships?: number
  rejectedRelationships: number
  emergentCandidates: number
  verifiedEmergentInsights: number
  rejectedEmergentInsights?: number
  discoveryPassesCompleted: string[]
  deduplicatedRelationships?: number
  relationshipClusters?: number
  significantRelationships?: number
  genericRelationshipsSuppressed?: number
  duplicateRelationshipsMerged?: number
  weakRelationshipsSuppressed?: number
  partialAgreementRejected?: number
  judgmentPropositions?: number
  unsupportedJudgmentPropositionsRemoved?: number
  judgmentConfidenceScore?: number
  sourceRelevancePrimary?: number
  sourceRelevanceSecondary?: number
  sourceRelevancePeripheral?: number
  sourceRelevanceOffTopic?: number
  claimsPrimaryTier?: number
  claimsSupportingTier?: number
  claimsPeripheralTier?: number
  funnelFinalUsable?: number
  topicRelevant?: number
  comparableClaims?: number
  generationEligible?: number
  highConfidenceClaims?: number
  comparableLimited?: number
  comparableExcluded?: number
  comparableRecoveryRecovered?: number
  normalizedPropositions?: number
  verifiedAgreements?: number
  verifiedComplementary?: number
  verifiedContradictions?: number
  claimAlignmentDirect?: number
  claimAlignmentSupporting?: number
  claimAlignmentContextual?: number
  claimAlignmentUnrelated?: number
  directlyAnswerableSources?: number
  questionAlignedCandidates?: number
  sharedPropositionCandidates?: number
  topicOnlyRejected?: number
  differentDimensionRejected?: number
  genericSuppressed?: number
  malformedSuppressed?: number
  candidateQualityInput?: number
  noRelationshipReason?: string
  goodZeroResult?: boolean
}

export type RelationshipVerificationDiagnostic = {
  fromClaimId: string
  toClaimId: string
  fromSourceId: string
  toSourceId: string
  fromClaimText: string
  toClaimText: string
  proposedType: ReasoningRelationshipType
  stage: 'PRE_LLM' | 'POST_LLM' | 'POST_HEURISTIC'
  rejectionReason?: RejectionReason
  rejectionDetail?: string
  scores: import('@/lib/reasoning/verification-alignment').VerificationAlignmentScores
}

export type ReasoningDiagnostics = {
  survivalTest: SurvivalTestScores
  rejectedRelationshipCount: number
  rejectedInsightCount: number
  clusterCount: number
  primaryClusterSourceCount: number
  passesRun: string[]
  pipelineStats?: PipelineStats
  judgmentPropositionLineage?: import('@/lib/reasoning/judgment-lineage').JudgmentPropositionLineage[]
  sourceCountSummary?: import('@/lib/reasoning/judgment-lineage').SourceCountSummary
  relevanceFunnel?: import('@/lib/reasoning/claim-relevance').RelevanceFunnel
  claimRelevanceDiagnostics?: import('@/lib/reasoning/claim-relevance').ClaimRelevanceDiagnostic[]
  pipelineWarnings?: import('@/lib/reasoning/claim-relevance').PipelineWarning[]
  candidateFunnel?: import('@/lib/reasoning/candidate-funnel').CandidateFunnel
  candidateGenerationDiagnostics?: import('@/lib/reasoning/candidate-funnel').CandidateGenerationDiagnostic[]
  sourceParticipation?: import('@/lib/reasoning/source-participation').SourceParticipationDiagnostics
  claimTransitionDiagnostics?: import('@/lib/reasoning/claim-transition').ClaimTransitionRow[]
  comparableClaimFunnel?: import('@/lib/reasoning/comparable-claim-pool').ComparablePoolStats
  relationshipVerificationDiagnostics?: RelationshipVerificationDiagnostic[]
  verificationDiagnosticsBundle?: import('@/lib/reasoning/verification-diagnostics').VerificationDiagnosticsBundle
  evidenceCoverage?: import('@/lib/reasoning/evidence-coverage').EvidenceCoverageStats
  questionIntent?: import('@/lib/reasoning/v2/question-intent').QuestionIntent
  sourceAnswerability?: import('@/lib/reasoning/v2/source-answerability').SourceAnswerabilityRecord[]
  claimAlignmentDiagnostics?: import('@/lib/reasoning/v2/claim-question-alignment').ClaimAlignmentRecord[]
}

export type ReasoningLandscape = {
  agree: { countLabel: string; cards: LandscapeCard[] }
  divide: { countLabel: string; cards: LandscapeCard[] }
  unclear: { countLabel: string; cards: LandscapeCard[] }
}

export type ExcludedReasoningSource = {
  sourceId: string
  videoId: string
  voiceIndex: number
  title: string
  reason: string
  clusterId?: string
}

export type SingleSourceReasoning = {
  mode: 'single'
  version: string
  summary: string
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  concepts: ReasoningConcept[]
  assumptions: ReasoningAssumption[]
  coreArgument: string
  stanceSummary: string | null
  weakPoints: string[]
  keyInsight: string | null
  questions: string[]
  createdAt: string
}

export type RelationshipCluster = {
  id: string
  canonicalClaim: string
  label: string
  type: ReasoningRelationshipType
  dimension: string
  memberRelationshipIds: string[]
  supportingClaimIds: string[]
  supportingSourceIds: string[]
  sourceCount: number
  sourcePairCount: number
  evidenceCount: number
  confidence: ConfidenceLevel
  significanceScore: number
  noveltyScore: number
  evidenceStrength: number
  genericnessScore: number
  visualKind: 'agree' | 'divide' | 'trade-off' | 'neutral'
  parentIds: string[]
  childIds: string[]
}

export type RejectedEmergentCandidate = {
  insight: ReasoningInsight
  reason: import('@/lib/reasoning/emergent-gate').EmergentRejectionReason
}

export type MultiSourceReasoning = {
  mode: 'multi'
  version: string
  schemaVersion?: number
  centralQuestion: string
  clusters: ReasoningCluster[]
  sourceRelevance?: SourceRelevance[]
  excludedSources: ExcludedReasoningSource[]
  claims: ReasoningClaim[]
  evidence: ReasoningEvidence[]
  concepts: ReasoningConcept[]
  stances: ReasoningStance[]
  assumptions: ReasoningAssumption[]
  relationships: ReasoningRelationship[]
  rejectedRelationships: ReasoningRelationship[]
  relationshipClusters?: RelationshipCluster[]
  significantRelationships?: RelationshipCluster[]
  patterns: ReasoningPattern[]
  synthesis: ReasoningSynthesisBlock | null
  judgment: ReasoningJudgment | null
  insights: ReasoningInsight[]
  rejectedEmergentCandidates?: RejectedEmergentCandidate[]
  knowledgeGaps: ReasoningKnowledgeGap[]
  landscape: ReasoningLandscape
  diagnostics: ReasoningDiagnostics
  createdAt: string
  analysisResult?: import('@/lib/reasoning/analysis-result').AnalysisResult
}

export type ReasoningAnalysis = SingleSourceReasoning | MultiSourceReasoning

export type ReasoningProgressPhase =
  | 'source_ingest'
  | 'clustering'
  | 'alignment'
  | 'relationships'
  | 'verification'
  | 'patterns'
  | 'synthesis'
  | 'judgment'
  | 'emergent'
  | 'critic'

export type ReasoningProgressEvent =
  | { type: 'phase'; phase: ReasoningProgressPhase; status: 'start' | 'complete' }
  | { type: 'log'; message: string }
