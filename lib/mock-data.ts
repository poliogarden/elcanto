/**
 * Demo-only mock data for synthesis/archive UI previews.
 * Runtime synthesis uses real API data — never import this in production flows.
 */

export type VoiceStance = 'for' | 'against' | 'neutral'

export type Voice = {
  n: number
  title: string
  channel: string
  duration: string
  stance: VoiceStance
  status: 'ready' | 'reading' | 'done'
}

export type EvidenceItem = {
  voice: number
  title: string
  timestamp: string
  excerpt: string
}

export type Consensus = {
  index: string
  agreeCount: number
  total: number
  claim: string
  voices: number[]
}

export type Disagreement = {
  question: string
  yes: { label: string; count: number; summary: string; voices: number[] }
  no: { label: string; count: number; summary: string; voices: number[] }
}

export type SuggestedAnswer = {
  question: string
  answer: string
  basedOn: number[]
  refs: { voice: number; timestamp: string }[]
}

export type Synthesis = {
  id: string
  number: string
  question: string
  voiceCount: number
  totalDuration: string
  date: string
  bottomLineLabel: string
  bottomLineHeadline: string[]
  bottomLine: string[]
  consensus: Consensus[]
  disagreement: Disagreement
  minority: {
    mentionedBy: number
    total: number
    claim: string
    detail: string
  }
  evidence: EvidenceItem[]
  voices: Voice[]
  suggested: SuggestedAnswer[]
}

export const voices: Voice[] = [
  { n: 1, title: 'Why AI Agents Will Change Programming Forever', channel: 'Fireship', duration: '18:42', stance: 'for', status: 'ready' },
  { n: 2, title: 'AI Agents Are Overhyped (And Here\u2019s the Data)', channel: 'The Primeagen', duration: '24:18', stance: 'against', status: 'ready' },
  { n: 3, title: 'I Replaced My Whole Workflow With Coding Agents', channel: 'ThePrimeTime', duration: '31:05', stance: 'for', status: 'ready' },
  { n: 4, title: 'The End of Junior Developers?', channel: 'Continuous Delivery', duration: '15:37', stance: 'for', status: 'ready' },
  { n: 5, title: 'What LLMs Still Cannot Do', channel: 'Computerphile', duration: '22:49', stance: 'against', status: 'ready' },
  { n: 6, title: 'Software Engineering in the Age of Agents', channel: 'Stanford Seminar', duration: '48:12', stance: 'neutral', status: 'ready' },
  { n: 7, title: 'The Future of Software Engineering', channel: 'GOTO Conferences', duration: '41:20', stance: 'neutral', status: 'ready' },
  { n: 8, title: 'AI Wrote 90% of My Startup\u2019s Code', channel: 'Y Combinator', duration: '27:54', stance: 'for', status: 'ready' },
  { n: 9, title: 'Why Senior Engineers Aren\u2019t Worried', channel: 'ThePrimeagen', duration: '19:11', stance: 'against', status: 'ready' },
  { n: 10, title: 'The Real Cost of Autonomous Coding Agents', channel: 'Two Minute Papers', duration: '13:26', stance: 'neutral', status: 'ready' },
]

export const analysisSteps = [
  'Reading transcripts',
  'Understanding each argument',
  'Extracting key claims',
  'Finding agreements',
  'Finding disagreements',
  'Checking evidence',
  'Building synthesis',
]

export const demoSynthesis: Synthesis = {
  id: 'synthesis-001',
  number: 'SYNTHESIS 001',
  question: 'Will AI coding replace developers?',
  voiceCount: 10,
  totalDuration: '4H 38M',
  date: 'AUG 16 2026',
  bottomLineLabel: 'THE BOTTOM LINE',
  bottomLineHeadline: ['AI is replacing', 'coding tasks,', 'not developers.'],
  bottomLine: [
    'Across ten voices \u2014 spanning working engineers, conference talks, and startup founders \u2014 the weight of the argument lands in a narrow place. AI coding agents are absorbing the mechanical middle of the job: boilerplate, glue code, first-draft tests, and routine refactors. On this, the room is loud and almost unanimous.',
    'Where the voices split is on people, not tools. The optimists read rising agent capability as a headcount story; the skeptics read it as a leverage story, where the same engineers simply ship more. Nobody credible argues that judgment, system design, and accountability are being automated away.',
    'The quieter, more interesting claim sits underneath both camps: the binding constraint may not be model capability at all, but the cost and reliability of running agents at scale. If that holds, the question stops being \u201ccan it code?\u201d and becomes \u201ccan you afford to let it?\u201d',
  ],
  consensus: [
    {
      index: '01 / CONSENSUS',
      agreeCount: 8,
      total: 10,
      claim: 'AI coding agents will become a standard part of the everyday development workflow \u2014 not an experiment, but infrastructure.',
      voices: [1, 3, 4, 6, 7, 8, 9, 10],
    },
    {
      index: '02 / CONSENSUS',
      agreeCount: 7,
      total: 10,
      claim: 'The value of a developer shifts from writing code toward specifying, reviewing, and taking responsibility for what the system produces.',
      voices: [1, 4, 5, 6, 7, 8, 9],
    },
  ],
  disagreement: {
    question: 'Will junior developers be replaced first?',
    yes: {
      label: 'YES',
      count: 6,
      summary:
        'Entry-level work is exactly the routine, well-specified coding that agents do best. If that rung disappears, hiring pipelines contract from the bottom up.',
      voices: [1, 3, 4, 6, 8, 10],
    },
    no: {
      label: 'NO',
      count: 4,
      summary:
        'Juniors become force multipliers with agents, and teams still need a pipeline of people who will one day hold senior judgment. Cutting the bottom starves the top.',
      voices: [2, 5, 7, 9],
    },
  },
  minority: {
    mentionedBy: 2,
    total: 10,
    claim: 'The cost of running autonomous coding agents may become a larger barrier than model capability.',
    detail:
      'Only two voices raise it, but the point is sharp: continuous, tool-using agents burn tokens and compute in ways that scale with ambition, not with headcount. The bottleneck could quietly move from \u201cis the model smart enough?\u201d to \u201ccan the org justify the bill?\u201d \u2014 a constraint most of the confident predictions never price in.',
  },
  evidence: [
    {
      voice: 3,
      title: 'I Replaced My Whole Workflow With Coding Agents',
      timestamp: '12:41',
      excerpt:
        '\u201cI stopped writing the first version of anything. I write the spec, the agent writes the code, and my whole day is now review and architecture. That shift is permanent for me.\u201d',
    },
    {
      voice: 2,
      title: 'AI Agents Are Overhyped (And Here\u2019s the Data)',
      timestamp: '09:12',
      excerpt:
        '\u201cThe demos are cherry-picked. On a real codebase with real ambiguity, the failure rate on non-trivial tasks is still high enough that a human has to own it.\u201d',
    },
    {
      voice: 7,
      title: 'The Future of Software Engineering',
      timestamp: '08:22',
      excerpt:
        '\u201cWe are not removing engineers. We are removing the parts of engineering nobody enjoyed. The job title survives; the day-to-day does not.\u201d',
    },
    {
      voice: 10,
      title: 'The Real Cost of Autonomous Coding Agents',
      timestamp: '05:58',
      excerpt:
        '\u201cEveryone talks about capability. Almost nobody talks about the invoice. An agent that reruns itself twenty times to get one PR right is not free.\u201d',
    },
  ],
  voices,
  suggested: [
    {
      question: 'What do they all agree on?',
      answer:
        'Eight of ten voices converge on one thing: coding agents are becoming standard workflow infrastructure rather than a novelty. The disagreement is never about whether the tools work \u2014 it is about what that does to teams and headcount.',
      basedOn: [1, 3, 4, 6, 7, 8, 9, 10],
      refs: [
        { voice: 7, timestamp: '08:22' },
        { voice: 3, timestamp: '12:41' },
      ],
    },
    {
      question: 'Where do they disagree most?',
      answer:
        'The sharpest split is over junior developers. Six voices argue entry-level work is the first to be automated because it is the most routine; four argue juniors become force multipliers and that cutting the bottom rung starves the future senior pipeline.',
      basedOn: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      refs: [
        { voice: 4, timestamp: '14:32' },
        { voice: 9, timestamp: '06:40' },
      ],
    },
    {
      question: 'What did only a few people notice?',
      answer:
        'Only two voices raise the cost of running agents as the real ceiling. Their claim is that compute and token cost \u2014 not model capability \u2014 may become the binding constraint on autonomous coding at scale.',
      basedOn: [8, 10],
      refs: [{ voice: 10, timestamp: '05:58' }],
    },
    {
      question: 'What\u2019s the overall conclusion?',
      answer:
        'AI is replacing coding tasks, not developers. The mechanical middle of the job is being absorbed; judgment, design, and accountability are not. The open question is economic, not technical.',
      basedOn: [1, 3, 4, 5, 6, 7, 8, 9, 10],
      refs: [
        { voice: 7, timestamp: '08:22' },
        { voice: 2, timestamp: '09:12' },
      ],
    },
    {
      question: 'Which argument has the strongest evidence?',
      answer:
        'The claim that the developer role shifts toward review and specification is the best-supported. It is stated first-hand by practitioners changing their own workflow (Voice 03) and echoed structurally by conference talks (Voice 07), rather than resting on projection.',
      basedOn: [3, 6, 7, 8],
      refs: [
        { voice: 3, timestamp: '12:41' },
        { voice: 7, timestamp: '08:22' },
      ],
    },
    {
      question: 'Give me the strongest argument from each side.',
      answer:
        'For: agents already handle the routine coding that fills a junior\u2019s day, so that work compresses fast (Voice 04). Against: real codebases carry ambiguity that agents still fail on, so a human must own every non-trivial change (Voice 02). Both can be true at once \u2014 which is why the honest answer is \u201ctasks, not people.\u201d',
      basedOn: [2, 4],
      refs: [
        { voice: 4, timestamp: '14:32' },
        { voice: 2, timestamp: '09:12' },
      ],
    },
  ],
}

export type ArchiveEntry = {
  number: string
  question: string
  voiceCount: number
  date: string
}

export const archive: ArchiveEntry[] = [
  { number: 'SYNTHESIS 014', question: 'Is MCP actually becoming a standard?', voiceCount: 12, date: 'AUG 14 2026' },
  { number: 'SYNTHESIS 013', question: 'Will AI replace junior developers?', voiceCount: 8, date: 'AUG 12 2026' },
  { number: 'SYNTHESIS 012', question: 'Is vibe coding actually useful?', voiceCount: 16, date: 'AUG 08 2026' },
  { number: 'SYNTHESIS 011', question: 'Are small language models the real future?', voiceCount: 9, date: 'AUG 03 2026' },
  { number: 'SYNTHESIS 010', question: 'Has the scaling era of AI ended?', voiceCount: 14, date: 'JUL 29 2026' },
  { number: 'SYNTHESIS 009', question: 'Is RAG dead in long-context models?', voiceCount: 7, date: 'JUL 22 2026' },
  { number: 'SYNTHESIS 008', question: 'Do developers actually get faster with AI?', voiceCount: 11, date: 'JUL 15 2026' },
  { number: 'SYNTHESIS 007', question: 'Will open weights win the enterprise?', voiceCount: 10, date: 'JUL 09 2026' },
]
