import { describe, expect, it } from 'vitest'
import {
  buildExtractionCoverageDiagnostics,
  isMeaningfulSection,
  isPlaceholderSectionContent,
} from '@/lib/pipeline/extraction-diagnostics'
import type { SectionKnowledge } from '@/lib/types/video-knowledge'

function section(partial: Partial<SectionKnowledge> & Pick<SectionKnowledge, 'sectionId'>): SectionKnowledge {
  return {
    sectionId: partial.sectionId,
    startTime: partial.startTime ?? 0,
    endTime: partial.endTime ?? 60,
    topic: partial.topic ?? 'topic',
    summary: partial.summary ?? 'MCP integration is faster than disparate API wiring.',
    claims: partial.claims ?? [],
    entities: partial.entities ?? [],
    importanceScore: partial.importanceScore ?? 0.5,
    noveltyScore: partial.noveltyScore ?? 0.4,
    argumentDensity: partial.argumentDensity ?? 0.5,
    evidenceDensity: partial.evidenceDensity ?? 0.5,
    text: partial.text,
    deepAnalyzed: partial.deepAnalyzed,
  }
}

describe('extraction diagnostics', () => {
  it('flags meaningful empty sections as EXTRACTION_MISS', () => {
    const diag = buildExtractionCoverageDiagnostics({
      sourceId: 'source_2',
      sections: [
        section({
          sectionId: 'section_23',
          summary:
            'The section compares existing APIs with MCP and notes integration differences.',
          argumentDensity: 0.6,
          evidenceDensity: 0.55,
        }),
      ],
    })
    expect(diag.meaningfulSections).toBe(1)
    expect(diag.emptyMeaningfulSections).toBe(1)
    expect(diag.emptyClaimSections[0]?.reason).toBe('EXTRACTION_MISS')
    expect(diag.warnings[0]?.code).toBe('EMPTY_CLAIM_SECTION')
  })

  it('does not treat placeholder intro as meaningful', () => {
    expect(
      isPlaceholderSectionContent(
        'The speaker introduces the topic but does not provide detailed information.',
      ),
    ).toBe(true)
    expect(
      isMeaningfulSection(
        section({
          sectionId: 'section_1',
          summary: 'The speaker introduces the topic but does not provide detailed information.',
          argumentDensity: 0.1,
        }),
      ),
    ).toBe(false)
  })

  it('counts sections with claims toward coverage ratio', () => {
    const diag = buildExtractionCoverageDiagnostics({
      sourceId: 'source_2',
      sections: [
        section({
          sectionId: 'section_5',
          claims: [
            {
              id: 'source_2_sec5_claim_1',
              statement: 'MCP requires less technical expertise than API integration.',
              topic: 'comparison',
              confidence: 0.8,
            },
          ],
        }),
      ],
    })
    expect(diag.coverageRatio).toBe(1)
    expect(diag.sectionsWithClaims).toBe(1)
  })
})
