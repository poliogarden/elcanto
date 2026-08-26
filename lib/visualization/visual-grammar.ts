import type { ReasoningRelationshipType } from '@/lib/reasoning/types'

export type VisualRelationKind =
  | 'agree'
  | 'divide'
  | 'trade-off'
  | 'complement'
  | 'dependency'
  | 'unclear'
  | 'excluded'
  | 'neutral'

export type VisualGrammar = {
  kind: VisualRelationKind
  icon: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  connector: string
  label: string
  accentClass: string
}

const GRAMMAR: Record<VisualRelationKind, VisualGrammar> = {
  agree: {
    kind: 'agree',
    icon: '✓',
    lineStyle: 'solid',
    connector: '────────',
    label: 'Agree',
    accentClass: 'text-ink',
  },
  divide: {
    kind: 'divide',
    icon: '⚡',
    lineStyle: 'dashed',
    connector: '──── ⚡ ────',
    label: 'Divide',
    accentClass: 'text-coral',
  },
  'trade-off': {
    kind: 'trade-off',
    icon: '↔',
    lineStyle: 'dashed',
    connector: '←────────→',
    label: 'Trade-off',
    accentClass: 'text-coral',
  },
  complement: {
    kind: 'complement',
    icon: '+',
    lineStyle: 'solid',
    connector: '──── + ────',
    label: 'Complement',
    accentClass: 'text-ink',
  },
  dependency: {
    kind: 'dependency',
    icon: '→',
    lineStyle: 'solid',
    connector: '──── → ────',
    label: 'Dependency',
    accentClass: 'text-ink-soft',
  },
  unclear: {
    kind: 'unclear',
    icon: '?',
    lineStyle: 'dotted',
    connector: '- - - ? - - -',
    label: 'Unclear',
    accentClass: 'text-ink-soft',
  },
  excluded: {
    kind: 'excluded',
    icon: '○',
    lineStyle: 'dotted',
    connector: '',
    label: 'Excluded',
    accentClass: 'text-ink-soft/50',
  },
  neutral: {
    kind: 'neutral',
    icon: '·',
    lineStyle: 'solid',
    connector: '────────',
    label: 'Related',
    accentClass: 'text-ink-soft',
  },
}

export function grammarForRelationshipType(type: ReasoningRelationshipType | string): VisualGrammar {
  switch (type) {
    case 'AGREEMENT':
    case 'PARTIAL_AGREEMENT':
      return GRAMMAR.agree
    case 'CONTRADICTION':
      return GRAMMAR.divide
    case 'TENSION':
      return GRAMMAR['trade-off']
    case 'COMPLEMENTARY':
      return GRAMMAR.complement
    case 'DEPENDENCY':
    case 'CAUSE_EFFECT':
      return GRAMMAR.dependency
    default:
      return GRAMMAR.neutral
  }
}

export function grammarForPatternType(
  patternType: string,
  hasTension: boolean,
): VisualGrammar {
  if (patternType === 'trade_off' || hasTension) return GRAMMAR['trade-off']
  if (patternType === 'polarization') return GRAMMAR.divide
  if (
    patternType === 'recurring_driver' ||
    patternType === 'shared_causal_mechanism'
  ) {
    return GRAMMAR.agree
  }
  return GRAMMAR.neutral
}

export function getVisualGrammar(kind: VisualRelationKind): VisualGrammar {
  return GRAMMAR[kind]
}
