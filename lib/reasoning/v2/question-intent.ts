import { extractTopicTokens } from '@/lib/reasoning/claim-relevance'
import { normalizeStatement } from '@/lib/reasoning/source-ingest'

export type QuestionExpectedAnswerType =
  | 'evaluation'
  | 'comparison'
  | 'explanation'
  | 'prediction'
  | 'definition'
  | 'general'

export type QuestionIntent = {
  rawQuestion: string
  subject: string
  target?: string
  dimension: string
  predicate: string
  expectedAnswerType: QuestionExpectedAnswerType
  scope: string
  topicTokens: string[]
}

const EVAL_PATTERNS =
  /\b(mean|means|significant|exceptional|good|bad|really|truly|actually|whether|is it|does it|worth|important)\b/i
const COMPARE_PATTERNS = /\b(versus|vs\.?|compared|better|worse|more than|less than)\b/i
const DEF_PATTERNS = /\b(what is|what are|define|definition|means)\b/i

export function extractQuestionIntent(centralQuestion: string): QuestionIntent {
  const raw = centralQuestion.trim()
  const topicTokens = extractTopicTokens(raw)
  const norm = normalizeStatement(raw)

  let expectedAnswerType: QuestionExpectedAnswerType = 'general'
  if (EVAL_PATTERNS.test(raw)) expectedAnswerType = 'evaluation'
  else if (COMPARE_PATTERNS.test(raw)) expectedAnswerType = 'comparison'
  else if (DEF_PATTERNS.test(raw)) expectedAnswerType = 'definition'
  else if (/\bwhy\b/i.test(raw)) expectedAnswerType = 'explanation'
  else if (/\bwill\b|\bfuture\b|\bpredict/i.test(raw)) expectedAnswerType = 'prediction'

  const percentMatch = raw.match(/(\d{1,3})\s*%/)
  const target = percentMatch ? `${percentMatch[1]}%` : undefined

  const subjectTokens = topicTokens.filter(
    (t) => !['accuracy', 'percent', 'ability', 'skill', 'performance', 'decision'].includes(t),
  )
  const subject =
    subjectTokens.length > 0
      ? subjectTokens.slice(0, 4).join(' ')
      : topicTokens.slice(0, 4).join(' ') || 'topic'

  let dimension = 'general'
  if (/\b(accuracy|percent|rate|score)\b/i.test(raw)) dimension = 'performance_metric'
  else if (/\b(skill|ability|capability|competence)\b/i.test(raw)) dimension = 'skill_quality'
  else if (/\b(cost|price|economic)\b/i.test(raw)) dimension = 'economic'
  else if (/\b(marketing|brand|advertis)/i.test(raw)) dimension = 'marketing'

  const predicate = norm.slice(0, 120)

  return {
    rawQuestion: raw,
    subject,
    target,
    dimension,
    predicate,
    expectedAnswerType,
    scope: topicTokens.join(' '),
    topicTokens,
  }
}
