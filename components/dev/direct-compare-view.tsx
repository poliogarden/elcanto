'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DirectPipelineRun } from '@/lib/direct-synthesis/types'
import type { ComparePreferenceRecord, HumanComparePreference } from '@/lib/direct-synthesis/types'
import type { V2CompareSnapshot } from '@/lib/direct-synthesis/v2-snapshot'
import type { FinalDecisionCase } from '@/lib/direct-synthesis/cases'

type ComparePayload = {
  case: FinalDecisionCase
  centralQuestion?: string
  v2: V2CompareSnapshot | null
  direct: DirectPipelineRun | null
  preference: ComparePreferenceRecord | null
}

function CostLine(props: { label: string; ms?: number; cost?: V2CompareSnapshot['cost'] }) {
  const { label, ms, cost } = props
  return (
    <p className="text-xs text-ink-soft mt-2">
      {label}: {ms != null ? `${ms} ms` : '—'} · LLM {cost?.llmCalls ?? '—'} · tokens{' '}
      {cost?.inputTokens ?? '—'}/{cost?.outputTokens ?? '—'} · ~$
      {cost?.estimatedCostUsd != null ? cost.estimatedCostUsd.toFixed(4) : '—'}
    </p>
  )
}

export function DirectCompareView({ caseId }: { caseId: string }) {
  const [data, setData] = useState<ComparePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [preference, setPreference] = useState<HumanComparePreference | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dev/direct-compare/${caseId}`)
      if (!res.ok) throw new Error('Failed to load')
      const json = (await res.json()) as ComparePayload
      setData(json)
      if (json.preference) {
        setPreference(json.preference.preference)
        setNote(json.preference.note ?? '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(action: 'run_direct' | 'run_v2' | 'run_all') {
    setRunning(action)
    setError(null)
    try {
      const res = await fetch(`/api/dev/direct-compare/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Run failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(null)
    }
  }

  async function savePreference() {
    if (!preference) return
    setRunning('preference')
    try {
      await fetch(`/api/dev/direct-compare/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_preference',
          preference,
          note: note.trim() || undefined,
        }),
      })
      await load()
    } finally {
      setRunning(null)
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-ink-soft">Loading…</p>
  }

  if (!data) {
    return <p className="text-sm text-red-600">{error ?? 'No data'}</p>
  }

  const { case: caseDef, centralQuestion, v2, direct } = data

  return (
    <div className="space-y-8">
      <header className="border-b border-paper-3 pb-6">
        <h1 className="text-xl font-semibold text-ink">{caseDef.label}</h1>
        <p className="mt-1 text-xs text-ink-soft">
          {caseDef.isRealYouTube ? 'Real YouTube sources' : 'Prepared benchmark set'} · slug{' '}
          {caseDef.slug}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={running != null}
            onClick={() => runAction('run_direct')}
            className="rounded-md border border-paper-3 px-3 py-1.5 text-sm hover:bg-paper-2 disabled:opacity-50"
          >
            {running === 'run_direct' ? 'Running Direct…' : 'Run Direct'}
          </button>
          {caseDef.slug !== 'case-a' && (
            <button
              type="button"
              disabled={running != null}
              onClick={() => runAction('run_v2')}
              className="rounded-md border border-paper-3 px-3 py-1.5 text-sm hover:bg-paper-2 disabled:opacity-50"
            >
              {running === 'run_v2' ? 'Running V2…' : 'Run V2 (benchmark)'}
            </button>
          )}
          <button
            type="button"
            disabled={running != null}
            onClick={() => runAction('run_all')}
            className="rounded-md border border-paper-3 px-3 py-1.5 text-sm hover:bg-paper-2 disabled:opacity-50"
          >
            {running === 'run_all' ? 'Running…' : 'Run full case'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </header>

      <section className="rounded-lg border border-paper-3 bg-paper-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Central Question
        </h2>
        <p className="mt-3 text-lg text-ink leading-relaxed">
          {centralQuestion ?? v2?.centralQuestion ?? direct?.result.centralQuestion ?? '—'}
        </p>
      </section>

      <section className="rounded-lg border border-paper-3 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Current V2.2
        </h2>
        {v2 ? (
          <>
            <p className="mt-4 text-ink leading-relaxed whitespace-pre-wrap">{v2.displayMessage}</p>
            {v2.relationshipCount > 0 && (
                <p className="mt-2 text-sm text-ink-soft">
                Verified relationships: {v2.relationshipCount}
              </p>
            )}
            {v2.agreements.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Agreement</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft space-y-1">
                  {v2.agreements.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            {v2.divides.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Divide</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft space-y-1">
                  {v2.divides.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
            {v2.pipelineStats && (
              <p className="mt-4 text-xs text-ink-soft">
                Funnel: {String(v2.pipelineStats.claimsExtracted ?? '—')} claims ·{' '}
                {String(v2.pipelineStats.candidatePairs ?? '—')} candidates ·{' '}
                {String(v2.pipelineStats.verifiedRelationships ?? '—')} verified ·{' '}
                {String(v2.pipelineStats.rejectedRelationships ?? '—')} rejected
              </p>
            )}
            <CostLine label="V2" ms={v2.timingMs} cost={v2.cost} />
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">No V2 snapshot. Run case or load from job.</p>
        )}
      </section>

      <section className="rounded-lg border border-paper-3 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Direct Synthesis
        </h2>
        {direct ? (
          <>
            <p className="mt-4 text-ink leading-relaxed whitespace-pre-wrap">
              {direct.result.directAnswer}
            </p>

            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium">Source Contributions</h3>
              {direct.result.sourceAnswers.map((sa) => (
                <div key={sa.sourceId} className="rounded border border-paper-3 p-3 text-sm">
                  <p className="font-medium">{sa.sourceTitle}</p>
                  <p className="text-ink-soft mt-1">Answerability: {sa.answerability}</p>
                  {sa.answer && <p className="mt-2">{sa.answer}</p>}
                  {sa.keyEvidence.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-ink-soft space-y-1">
                      {sa.keyEvidence.map((ev, i) => (
                        <li key={i}>
                          {ev.startTime != null ? `[${ev.startTime}s] ` : ''}
                          {ev.text.slice(0, 200)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {direct.result.agreements.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Agreement</h3>
                <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                  {direct.result.agreements.map((a) => (
                    <li key={a.statement}>{a.statement}</li>
                  ))}
                </ul>
              </div>
            )}

            {direct.result.disagreements.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Disagreement</h3>
                <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                  {direct.result.disagreements.map((d) => (
                    <li key={d.statement}>{d.statement}</li>
                  ))}
                </ul>
              </div>
            )}

            {direct.result.nonComparableSources.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Cannot Compare</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft space-y-1">
                  {direct.result.nonComparableSources.map((n) => (
                    <li key={n.sourceId}>{n.sourceId}: {n.reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <CostLine
              label="Direct"
              ms={direct.timingMs.totalMs}
              cost={{
                llmCalls: direct.cost.llmCalls,
                inputTokens: direct.cost.inputTokens,
                outputTokens: direct.cost.outputTokens,
                estimatedCostUsd: direct.cost.estimatedCostUsd,
              }}
            />
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">No Direct result yet. Click Run Direct.</p>
        )}
      </section>

      <section className="rounded-lg border border-paper-3 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Which result is actually more useful?
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['CURRENT_V2', 'Current V2'],
              ['DIRECT', 'Direct'],
              ['BOTH_HAVE_VALUE', 'Both have value'],
              ['NEITHER', 'Neither'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                preference === value
                  ? 'border-ink bg-ink text-paper-1'
                  : 'border-paper-3 hover:bg-paper-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-ink-soft">Why? (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-paper-3 bg-paper-1 p-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!preference || running != null}
          onClick={savePreference}
          className="mt-3 rounded-md bg-ink px-4 py-2 text-sm text-paper-1 disabled:opacity-50"
        >
          Save preference
        </button>
      </section>
    </div>
  )
}
