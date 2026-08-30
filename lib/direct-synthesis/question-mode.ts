export type QuestionMode = 'CONTENT_QUESTION' | 'SYNTHESIS_QUESTION'

export type SynthesisIntent =
  | 'general'
  | 'agree'
  | 'divide'
  | 'insight'
  | 'conclusion'

const SYNTHESIS_QUESTION_PATTERNS: RegExp[] = [
  /함께\s*(봤|보|읽)/,
  /함께\s*보면/,
  /함께\s*봤을\s*때/,
  /이\s*영상들을\s*함께/,
  /여러\s*영상.*함께/,
  /세\s*영상.*종합/,
  /영상들?을\s*종합/,
  /종합하면/,
  /종합\s*결론/,
  /공통점/,
  /공통된\s*주장/,
  /공통적으로/,
  /차이점/,
  /의견이\s*다른/,
  /서로\s*다른\s*부분/,
  /비교해/,
  /비교해줘/,
  /관점을\s*비교/,
  /each\s+video.*perspective/i,
  /compare\s+(these|the)\s+(videos|sources)/i,
  /what\s+do\s+these\s+(videos|sources)\s+share/i,
  /common\s+(theme|claim|point)/i,
  /where\s+do\s+they\s+(agree|disagree)/i,
  /what\s+emerges/i,
  /only\s+(visible|apparent|clear)\s+when/i,
  /together.*(?:see|show|reveal|emerge)/i,
  /when\s+(?:these|the)\s+(?:videos|sources)\s+are\s+(?:read|viewed)\s+together/i,
  /synthesize\s+these/i,
]

const INTENT_AGREE = [/공통점/, /공통된/, /common\s+/, /where\s+they\s+agree/i, /share\s+in\s+common/i]
const INTENT_DIVIDE = [
  /차이점/,
  /의견이\s*다른/,
  /서로\s*다른/,
  /disagree/i,
  /diverge/i,
  /contrast/i,
]
const INTENT_INSIGHT = [
  /함께\s*봤을\s*때만/,
  /함께\s*보면\s*만/,
  /only\s+when.*together/i,
  /what\s+emerges/i,
  /보이는\s*것/,
  /only\s+visible/i,
]
const INTENT_CONCLUSION = [/종합\s*결론/, /종합하면/, /synthesiz/i, /overall\s+conclusion/i]

export function detectQuestionMode(question: string): QuestionMode {
  const q = question.trim()
  if (!q) return 'CONTENT_QUESTION'
  if (SYNTHESIS_QUESTION_PATTERNS.some((pattern) => pattern.test(q))) {
    return 'SYNTHESIS_QUESTION'
  }
  return 'CONTENT_QUESTION'
}

export function detectSynthesisIntent(question: string): SynthesisIntent {
  const q = question.trim()
  if (INTENT_AGREE.some((p) => p.test(q))) return 'agree'
  if (INTENT_DIVIDE.some((p) => p.test(q))) return 'divide'
  if (INTENT_INSIGHT.some((p) => p.test(q))) return 'insight'
  if (INTENT_CONCLUSION.some((p) => p.test(q))) return 'conclusion'
  return 'general'
}

export function synthesisIntentPromptHint(intent: SynthesisIntent): string {
  switch (intent) {
    case 'agree':
      return 'User emphasis: shared claims across sources (AGREE). Still omit unsupported relationships.'
    case 'divide':
      return 'User emphasis: genuine disagreements and distinct positions (DIVIDE, UNIQUE).'
    case 'insight':
      return 'User emphasis: cross-source INSIGHT that requires comparing multiple sources. Do not concatenate per-video summaries as insight. Set insight null if cross-source evidence is insufficient.'
    case 'conclusion':
      return 'User emphasis: synthesized ANSWER and cross-source INSIGHT toward a conclusion.'
    default:
      return 'Balance ANSWER with supported AGREE, DIVIDE, UNIQUE, and INSIGHT where evidence allows.'
  }
}
