import type { SynthesisViewModel } from '@/lib/types/view-model'

export function synthesisResultToPlainText(view: SynthesisViewModel): string {
  const out: string[] = []

  if (view.userQuestion) {
    out.push('YOUR QUESTION', view.userQuestion, '')
  }

  const hero =
    view.fourthIdea?.statement ||
    view.emergentStatement ||
    view.insights[0]?.statement ||
    view.bottomLine.join('\n')

  if (hero) {
    out.push('WHAT EMERGES', hero, '')
  }

  if (view.bottomLine.length > 0) {
    out.push('THE TAKE', ...view.bottomLine, '')
  }

  if (view.insights.length > 0) {
    out.push('INSIGHTS')
    for (const insight of view.insights) {
      out.push(`- ${insight.statement}`)
      if (insight.derivation) out.push(`  ${insight.derivation}`)
    }
    out.push('')
  }

  if (view.editorialDisagreements.length > 0) {
    out.push('DIFFERENCES')
    for (const d of view.editorialDisagreements) {
      out.push(`- ${d.title}`)
      if (d.whyItMatters) out.push(`  ${d.whyItMatters}`)
    }
    out.push('')
  }

  out.push(
    'SOURCES',
    ...view.voices.map((v) => `${String(v.n).padStart(2, '0')}. ${v.title} — ${v.channel}`),
  )

  return out.join('\n').trim()
}

export function synthesisResultToMarkdown(view: SynthesisViewModel): string {
  const sections: string[] = [`# Elcanto Synthesis`, ``]

  if (view.userQuestion) {
    sections.push(`## Your question`, `> ${view.userQuestion}`, ``)
  }

  const hero =
    view.fourthIdea?.statement ||
    view.emergentStatement ||
    view.insights[0]?.statement

  if (hero) {
    sections.push(`## What emerges`, `> ${hero}`, ``)
  }

  if (view.bottomLine.length > 0) {
    sections.push(`## The take`, ...view.bottomLine.map((p) => p), ``)
  }

  if (view.insights.length > 0) {
    sections.push(`## Insights`)
    for (const insight of view.insights) {
      sections.push(`### ${insight.statement}`)
      if (insight.derivation) sections.push(insight.derivation)
      sections.push(``)
    }
  }

  if (view.voices.length > 0) {
    sections.push(`## Videos`)
    for (const v of view.voices) {
      sections.push(`- **${v.title}** — ${v.channel}`)
    }
  }

  return sections.join('\n').trim()
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
