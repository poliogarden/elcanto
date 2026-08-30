import { describe, expect, it } from 'vitest'
import { assessComplementarySharedExplanation } from '@/lib/reasoning/complementary-alignment'
import { assessMinimumSharedProposition } from '@/lib/reasoning/proposition-alignment'
import {
  deriveDrivingRangeEquivalenceProposition,
  isNullEffectOpposition,
  isNumericRangeEquivalent,
  isOpposingDirectionPair,
} from '@/lib/reasoning/proposition-semantics'
import {
  passesVerificationPostGate,
  passesVerificationPreGate,
} from '@/lib/reasoning/verification-alignment'
import type { ReasoningClaim } from '@/lib/reasoning/types'

function claim(id: string, sourceId: string, statement: string): ReasoningClaim {
  return {
    id,
    sourceId,
    videoId: sourceId,
    voiceIndex: 1,
    statement,
    normalizedStatement: statement.toLowerCase(),
    evidenceIds: ['ev1'],
    claimType: 'factual',
    confidence: 'strong',
    conceptIds: [],
  }
}

describe('recall recovery semantic rules', () => {
  it('detects ocean pH decline agreement proposition', () => {
    const a = claim(
      'a',
      'source_1',
      'Open-ocean surface pH has declined by approximately 0.1 units since pre-industrial times due to carbon dioxide absorption.',
    )
    const b = claim(
      'b',
      'source_2',
      'Long-term seawater measurements show a measurable drop in average pH values across the global ocean surface layer over the past century.',
    )
    const result = assessMinimumSharedProposition(a, b)
    expect(result.passed).toBe(true)
    expect(result.entailedByA).toBe(true)
    expect(result.entailedByB).toBe(true)
  })

  it('detects EV range numeric equivalence', () => {
    const a = claim(
      'a',
      'source_1',
      'Current mass-market EV models typically deliver between 250 and 300 miles of EPA-rated range on a full charge.',
    )
    const b = claim(
      'b',
      'source_2',
      'Consumer electric vehicles on sale today generally achieve roughly 400 to 480 kilometers of driving range before requiring recharging.',
    )
    expect(isNumericRangeEquivalent(a.statement, b.statement)).toBe(true)
    expect(deriveDrivingRangeEquivalenceProposition(a.statement, b.statement)).toBeTruthy()
    const result = assessMinimumSharedProposition(a, b)
    expect(result.passed).toBe(true)
  })

  it('detects screen sleep null-effect divide opposition', () => {
    const a = claim(
      'a',
      'source_1',
      'Evening smartphone use before bedtime delays melatonin onset and shortens total sleep duration in adolescents.',
    )
    const b = claim(
      'b',
      'source_2',
      'Nightly mobile device use before sleep has no measurable impact on adolescent sleep quality or duration when controlling for caffeine intake.',
    )
    expect(isNullEffectOpposition(a.statement, b.statement)).toBe(true)
    const pre = passesVerificationPreGate(a, b, 'CONTRADICTION')
    expect(pre.passed).toBe(true)
    expect(pre.polarity).toBe('OPPOSE')
    const post = passesVerificationPostGate(a, b, 'CONTRADICTION')
    expect(post.passed).toBe(true)
  })

  it('detects fasting weight null-effect divide opposition', () => {
    const a = claim(
      'a',
      'source_1',
      'Intermittent fasting produces clinically meaningful weight loss in adults over 12 weeks.',
    )
    const b = claim(
      'b',
      'source_2',
      'Intermittent fasting produces no meaningful long-term weight loss benefit compared with standard calorie restriction.',
    )
    expect(isNullEffectOpposition(a.statement, b.statement)).toBe(true)
    const post = passesVerificationPostGate(a, b, 'CONTRADICTION')
    expect(post.passed).toBe(true)
  })

  it('detects telehealth readmission divide opposition', () => {
    const a = claim(
      'a',
      'source_1',
      'Virtual care visits reduce hospital readmission rates for chronic heart failure patients.',
    )
    const b = claim(
      'b',
      'source_2',
      'Hospital readmissions for heart failure patients rose after telehealth reimbursement cuts.',
    )
    expect(isOpposingDirectionPair(a.statement, b.statement)).toBe(true)
    const post = passesVerificationPostGate(a, b, 'CONTRADICTION')
    expect(post.passed).toBe(true)
  })

  it('detects carbon coal retirement pace opposition', () => {
    const a = claim(
      'a',
      'source_1',
      'Coal plant retirements in the EU declined 15% faster after emissions cap implementation.',
    )
    const b = claim(
      'b',
      'source_2',
      'EU coal capacity shutdowns slowed after carbon price volatility increased in 2023.',
    )
    expect(isOpposingDirectionPair(a.statement, b.statement)).toBe(true)
    const post = passesVerificationPostGate(a, b, 'CONTRADICTION')
    expect(post.passed).toBe(true)
  })

  it('detects wildfire complementary health outcomes', () => {
    const a = claim(
      'a',
      'source_1',
      'Fine particulate matter from wildfire smoke penetrates deep into lung tissue causing respiratory inflammation.',
    )
    const b = claim(
      'b',
      'source_2',
      'Wildfire smoke exposure correlates with increased cardiovascular emergency admissions within 48 hours of exposure.',
    )
    const result = assessComplementarySharedExplanation(a, b)
    expect(result.passed).toBe(true)
    expect(result.combinedExplanation.length).toBeGreaterThan(0)
  })

  it('detects coral bleaching complementary mechanism and outcome', () => {
    const a = claim(
      'a',
      'source_1',
      'Sustained ocean temperature spikes above 1°C above normal trigger coral polyps to expel symbiotic algae.',
    )
    const b = claim(
      'b',
      'source_2',
      'Coral reef ecosystems lose structural complexity and fish habitat diversity following mass bleaching events.',
    )
    const result = assessComplementarySharedExplanation(a, b)
    expect(result.passed).toBe(true)
  })

  it('detects telehealth rural access agreement', () => {
    const a = claim(
      'a',
      'source_1',
      'Increased telemedicine adoption expanded access to specialist consultations for rural patients.',
    )
    const b = claim(
      'b',
      'source_2',
      'Rural patients gained specialist access through expanded telehealth platform rollouts.',
    )
    const result = assessMinimumSharedProposition(a, b)
    expect(result.passed).toBe(true)
  })

  it('detects carbon pricing renewable investment agreement', () => {
    const a = claim(
      'a',
      'source_1',
      'Carbon pricing mechanisms accelerate renewable energy investment at utility scale.',
    )
    const b = claim(
      'b',
      'source_2',
      'Emissions trading schemes drive utility-scale clean energy capital allocation.',
    )
    const result = assessMinimumSharedProposition(a, b)
    expect(result.passed).toBe(true)
  })
})
