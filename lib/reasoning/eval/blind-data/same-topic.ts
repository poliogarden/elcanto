import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** C1: Solar — same entity, different dimensions (efficiency / manufacturing / adoption). */
export const BLIND_SAME_TOPIC_SOLAR_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_solar_01',
    voiceIndex: 1,
    title: 'Photovoltaic Cell Efficiency',
    channel: 'Solar Technology Lab',
    summary: 'Compares laboratory conversion efficiency across silicon cell types.',
    thesis: 'Monocrystalline cells outperform polycrystalline cells in efficiency tests.',
    topics: ['solar panels', 'photovoltaic efficiency', 'monocrystalline'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 20,
        endTime: 350,
        topic: 'Cell efficiency comparison',
        text:
          'Monocrystalline photovoltaic cells achieve higher laboratory conversion efficiency than polycrystalline alternatives under standardized illumination testing conditions.',
        claimStatement:
          'Monocrystalline photovoltaic cells achieve higher laboratory conversion efficiency than polycrystalline alternatives.',
        claimTopic: 'cell_efficiency',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_solar_02',
    voiceIndex: 2,
    title: 'Global Solar Manufacturing',
    channel: 'Clean Energy Markets',
    summary: 'Tracks factory capacity expansion in the photovoltaic supply chain.',
    thesis: 'Solar panel manufacturing capacity expanded rapidly in recent years.',
    topics: ['solar manufacturing', 'factory capacity', 'supply chain'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 35,
        endTime: 390,
        topic: 'Capacity expansion',
        text:
          'Global solar panel manufacturing capacity expanded by over 40% in the past three years driven by new factory buildouts in Southeast Asia and domestic incentive programs.',
        claimStatement:
          'Global solar panel manufacturing capacity expanded by over 40% in the past three years driven by factory buildouts.',
        claimTopic: 'manufacturing_capacity',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'blind_solar_03',
    voiceIndex: 3,
    title: 'Rooftop Solar Adoption',
    channel: 'Residential Energy Policy',
    summary: 'Analyzes state-level rooftop solar installation trends.',
    thesis: 'Net metering incentives accelerated residential solar adoption.',
    topics: ['rooftop solar', 'net metering', 'residential adoption'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 45,
        endTime: 400,
        topic: 'State adoption rates',
        text:
          'Residential rooftop solar adoption accelerated fastest in states with net metering incentives that credit homeowners for excess generation fed back into the grid.',
        claimStatement:
          'Residential rooftop solar adoption accelerated fastest in states with net metering incentives.',
        claimTopic: 'residential_adoption',
      },
    ],
  }),
]

/** C2: Quantum computing — mechanism / funding / error correction (different dimensions). */
export const BLIND_SAME_TOPIC_QUANTUM_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_quantum_01',
    voiceIndex: 1,
    title: 'Superconducting Qubit Benchmarks',
    channel: 'Quantum Hardware Review',
    summary: 'Benchmarks gate operation speeds across qubit architectures.',
    thesis: 'Superconducting qubits hold the record for gate operation speeds.',
    topics: ['quantum computing', 'superconducting qubits', 'gate speed'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 370,
        topic: 'Gate speed records',
        text:
          'Superconducting qubit architectures currently hold the record for quantum gate operation speeds in published benchmark tests across leading research laboratories.',
        claimStatement:
          'Superconducting qubit architectures currently hold the record for quantum gate operation speeds.',
        claimTopic: 'gate_speed',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_quantum_02',
    voiceIndex: 2,
    title: 'Quantum Startup Funding',
    channel: 'Venture Capital Tracker',
    summary: 'Annual venture funding flows into quantum computing startups.',
    thesis: 'Quantum computing venture funding exceeded $2 billion recently.',
    topics: ['quantum computing', 'venture capital', 'startup funding'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 360,
        topic: 'Funding totals',
        text:
          'Venture capital funding for quantum computing startups exceeded two billion dollars in the latest fiscal year as investors bet on fault-tolerant hardware roadmaps.',
        claimStatement:
          'Venture capital funding for quantum computing startups exceeded $2 billion in the latest fiscal year.',
        claimTopic: 'venture_funding',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'blind_quantum_03',
    voiceIndex: 3,
    title: 'Error Correction Challenges',
    channel: 'Quantum Systems Engineering',
    summary: 'Discusses practical barriers to fault-tolerant quantum computation.',
    thesis: 'Quantum error correction remains unsolved at commercial scale.',
    topics: ['quantum error correction', 'fault tolerance', 'engineering barriers'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 40,
        endTime: 410,
        topic: 'Fault tolerance gap',
        text:
          'Quantum error correction remains unsolved for practical fault-tolerant systems at commercial scale because physical qubit error rates still exceed thresholds required for logical qubit stability.',
        claimStatement:
          'Quantum error correction remains unsolved for practical fault-tolerant systems at commercial scale.',
        claimTopic: 'error_correction',
      },
    ],
  }),
]
