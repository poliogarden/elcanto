import type { SourceAnalysis } from '@/lib/types/source'
import { buildBenchmarkSource } from '@/lib/reasoning/eval/benchmark-source-builder'

/** F1: Telehealth — agreement on rural access, divide on readmissions, irrelevant parking. */
export const BLIND_COMPLEX_TELEHEALTH_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_telehealth_01',
    voiceIndex: 1,
    title: 'Rural Telemedicine Expansion',
    channel: 'Health Policy Review',
    summary: 'Reviews telehealth access outcomes for rural specialist care.',
    thesis: 'Telemedicine expanded rural specialist access.',
    topics: ['telehealth', 'rural access', 'specialist consultations'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 360,
        topic: 'Rural specialist access',
        text:
          'Increased telemedicine adoption expanded access to specialist consultations for rural patients who previously traveled hours to reach academic medical centers.',
        claimStatement:
          'Increased telemedicine adoption expanded access to specialist consultations for rural patients.',
        claimTopic: 'rural_access',
      },
      {
        sectionId: 'section_2',
        startTime: 380,
        endTime: 720,
        topic: 'Heart failure readmissions',
        text:
          'Virtual care visits reduce hospital readmission rates for chronic heart failure patients when remote monitoring protocols include daily symptom check-ins.',
        claimStatement:
          'Virtual care visits reduce hospital readmission rates for chronic heart failure patients.',
        claimTopic: 'readmission_rates',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_telehealth_02',
    voiceIndex: 2,
    title: 'Telehealth Platform Rollouts',
    channel: 'Digital Health Operations',
    summary: 'Covers platform deployment and reimbursement impacts on outcomes.',
    thesis: 'Telehealth rollouts changed rural access and readmission trends.',
    topics: ['telehealth platforms', 'rural care', 'readmissions'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 350,
        topic: 'Platform rural rollout',
        text:
          'Rural patients gained specialist access through expanded telehealth platform rollouts that connected community hospitals with subspecialty physicians via scheduled video consultations.',
        claimStatement:
          'Rural patients gained specialist access through expanded telehealth platform rollouts.',
        claimTopic: 'rural_access',
      },
      {
        sectionId: 'section_2',
        startTime: 370,
        endTime: 700,
        topic: 'Readmission after reimbursement cuts',
        text:
          'Hospital readmissions for heart failure patients rose after telehealth reimbursement cuts reduced the frequency of covered remote follow-up visits in several state Medicaid programs.',
        claimStatement:
          'Hospital readmissions for heart failure patients rose after telehealth reimbursement cuts.',
        claimTopic: 'readmission_rates',
      },
      {
        sectionId: 'section_3',
        startTime: 720,
        endTime: 980,
        topic: 'HIPAA video infrastructure',
        text:
          'Telehealth platforms require HIPAA-compliant video infrastructure for clinical use including encrypted sessions and audit logging of provider-patient interactions.',
        claimStatement:
          'Telehealth platforms require HIPAA-compliant video infrastructure for clinical use.',
        claimTopic: 'platform_requirements',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'blind_telehealth_03',
    voiceIndex: 3,
    title: 'Hospital Operations Update',
    channel: 'Regional Hospital News',
    summary: 'Covers billing code updates and parking garage expansion.',
    thesis: 'Billing codes changed and parking expanded at a regional hospital.',
    topics: ['medical billing', 'hospital parking', 'facility operations'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 20,
        endTime: 300,
        topic: 'Telehealth billing codes',
        text:
          'Medical billing codes for telehealth services were updated in the 2024 physician fee schedule to reflect new visit categories for audio-only and asynchronous consultations.',
        claimStatement:
          'Medical billing codes for telehealth services were updated in the 2024 physician fee schedule.',
        claimTopic: 'billing_codes',
      },
      {
        sectionId: 'section_2',
        startTime: 320,
        endTime: 560,
        topic: 'Parking garage expansion',
        text:
          'A regional hospital system parking garage expansion added 400 new spaces to accommodate outpatient clinic growth and reduce street parking congestion in surrounding neighborhoods.',
        claimStatement:
          'A regional hospital system parking garage expansion added 400 new spaces.',
        claimTopic: 'parking_expansion',
      },
    ],
  }),
]

/** F2: Carbon pricing — agreement on renewable investment, divide on coal retirements. */
export const BLIND_COMPLEX_CARBON_PRICING_SOURCES: SourceAnalysis[] = [
  buildBenchmarkSource({
    sourceId: 'source_1',
    videoId: 'blind_carbon_01',
    voiceIndex: 1,
    title: 'Carbon Pricing and Clean Energy',
    channel: 'Energy Economics Forum',
    summary: 'Links carbon pricing to utility renewable investment decisions.',
    thesis: 'Carbon pricing accelerates utility-scale renewable investment.',
    topics: ['carbon pricing', 'renewable energy', 'utility investment'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 30,
        endTime: 380,
        topic: 'Renewable investment acceleration',
        text:
          'Carbon pricing mechanisms accelerate renewable energy investment at utility scale by improving the relative economics of wind and solar projects versus unabated fossil generation.',
        claimStatement:
          'Carbon pricing mechanisms accelerate renewable energy investment at utility scale.',
        claimTopic: 'renewable_investment',
      },
      {
        sectionId: 'section_2',
        startTime: 400,
        endTime: 720,
        topic: 'EU coal retirements',
        text:
          'Coal plant retirements in the EU declined 15 percent faster after emissions cap implementation tightened the expected cost of continued coal operation.',
        claimStatement:
          'Coal plant retirements in the EU declined 15% faster after emissions cap implementation.',
        claimTopic: 'coal_retirements',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_2',
    videoId: 'blind_carbon_02',
    voiceIndex: 2,
    title: 'Emissions Trading Outcomes',
    channel: 'Climate Policy Monitor',
    summary: 'Tracks ETS impacts on clean energy capital and coal shutdowns.',
    thesis: 'Emissions trading shifts utility capital and affects coal shutdown pace.',
    topics: ['emissions trading', 'clean energy capital', 'coal capacity'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 35,
        endTime: 390,
        topic: 'ETS capital allocation',
        text:
          'Emissions trading schemes drive utility-scale clean energy capital allocation by assigning a market price to each ton of covered greenhouse gas emissions.',
        claimStatement:
          'Emissions trading schemes drive utility-scale clean energy capital allocation.',
        claimTopic: 'renewable_investment',
      },
      {
        sectionId: 'section_2',
        startTime: 410,
        endTime: 740,
        topic: 'Coal shutdown slowdown',
        text:
          'EU coal capacity shutdowns slowed after carbon price volatility increased in 2023, delaying announced closure dates for several large baseload plants.',
        claimStatement:
          'EU coal capacity shutdowns slowed after carbon price volatility increased in 2023.',
        claimTopic: 'coal_retirements',
      },
      {
        sectionId: 'section_3',
        startTime: 760,
        endTime: 1000,
        topic: 'Wind turbine cost decline',
        text:
          'Wind turbine installation costs fell 25 percent due to manufacturing scale improvements and larger rotor designs that increased annual energy yield per tower.',
        claimStatement:
          'Wind turbine installation costs fell 25% due to manufacturing scale improvements.',
        claimTopic: 'turbine_costs',
      },
    ],
  }),
  buildBenchmarkSource({
    sourceId: 'source_3',
    videoId: 'blind_carbon_03',
    voiceIndex: 3,
    title: 'Mediterranean Tourism and Fisheries',
    channel: 'Regional Economic Brief',
    summary: 'Tourism rebound and fishing quota changes in unrelated sectors.',
    thesis: 'Cruise tourism rebounded; tuna quotas were reduced.',
    topics: ['cruise tourism', 'fishing quotas', 'Mediterranean economy'],
    segments: [
      {
        sectionId: 'section_1',
        startTime: 25,
        endTime: 320,
        topic: 'Cruise tourism rebound',
        text:
          'Mediterranean cruise tourism revenue rebounded to pre-pandemic levels in summer 2024 as major operators restored full itineraries across Greek and Italian port cities.',
        claimStatement:
          'Mediterranean cruise tourism revenue rebounded to pre-pandemic levels in summer 2024.',
        claimTopic: 'cruise_tourism',
      },
      {
        sectionId: 'section_2',
        startTime: 340,
        endTime: 580,
        topic: 'Tuna quota reduction',
        text:
          'Deep-sea fishing quotas for bluefin tuna were reduced by 20 percent in Atlantic fisheries following stock assessments that showed slower recovery than projected.',
        claimStatement:
          'Deep-sea fishing quotas for bluefin tuna were reduced by 20% in Atlantic fisheries.',
        claimTopic: 'fishing_quotas',
      },
    ],
  }),
]
