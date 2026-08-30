'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  AcceptanceFailureCategory,
  AcceptanceRating,
  ProductAcceptanceRecord,
} from '@/lib/production/types'
import type { RecentSynthesisJobSummary } from '@/lib/synthesis/synthesis-job-store'
import type { AcceptanceBacklogSummary } from '@/lib/production/product-acceptance-store'

const RATINGS: AcceptanceRating[] = ['good', 'partial', 'bad']
const FAILURE_CATEGORIES: AcceptanceFailureCategory[] = [
  'INGEST_FAILURE',
  'TRANSCRIPT_FAILURE',
  'EXTRACTION_FAILURE',
  'EVIDENCE_FAILURE',
  'RELEVANCE_FAILURE',
  'RELATIONSHIP_MISS',
  'FALSE_RELATIONSHIP',
  'JUDGMENT_FAILURE',
  'UX_COMPREHENSION_FAILURE',
  'PERFORMANCE_FAILURE',
]

type DashboardData = {
  jobs: RecentSynthesisJobSummary[]
  acceptanceBySynthesisId: Record<string, ProductAcceptanceRecord>
  backlog: AcceptanceBacklogSummary
}

function RatingSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: AcceptanceRating
  onChange: (v: AcceptanceRating) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-ink-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AcceptanceRating)}
        className="rounded border border-paper-3 bg-paper px-2 py-1 text-sm"
      >
        {RATINGS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </label>
  )
}

function defaultForm(job: RecentSynthesisJobSummary): ProductAcceptanceRecord {
  return {
    synthesisId: job.synthesisId,
    sourceCount: job.voiceCount,
    analysisQuality: 'partial',
    agreementQuality: 'partial',
    divideQuality: 'partial',
    complementaryQuality: 'partial',
    evidenceQuality: 'partial',
    synthesisQuality: 'partial',
    missedRelationship: false,
    falseRelationship: false,
    timeSaving: 'partial',
    wouldReuse: 'partial',
    engineVersion: job.engineVersion,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function AcceptanceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductAcceptanceRecord | null>(null)
  const [failureCategories, setFailureCategories] = useState<AcceptanceFailureCategory[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/dev/acceptance?limit=40')
    if (!res.ok) return
    const json = (await res.json()) as DashboardData
    setData(json)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function selectJob(job: RecentSynthesisJobSummary) {
    setSelectedId(job.synthesisId)
    const existing = data?.acceptanceBySynthesisId[job.synthesisId]
    setForm(existing ?? defaultForm(job))
    setFailureCategories(existing?.failureCategories ?? [])
    setMessage(null)
  }

  async function save() {
    if (!form) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/dev/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          failureCategories,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setMessage(err.error ?? 'Save failed')
        return
      }
      setMessage('Saved.')
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return <p className="text-sm text-ink-soft">Loading acceptance dashboard…</p>
  }

  return (
    <div className="space-y-8 font-ui">
      <section>
        <h2 className="text-lg font-semibold text-ink">V3 backlog (from acceptance)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Rated: {data.backlog.totalRated} · Missed relationships: {data.backlog.missedRelationshipCount} ·
          False relationships: {data.backlog.falseRelationshipCount}
        </p>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {Object.entries(data.backlog.byCategory)
            .filter(([, n]) => n > 0)
            .map(([cat, n]) => (
              <li key={cat} className="text-ink-soft">
                {cat}: <span className="text-ink">{n}</span>
              </li>
            ))}
        </ul>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">Recent synthesis jobs</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-paper-3">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-2 text-xs text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Topic</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Videos</th>
                  <th className="px-3 py-2">Engine</th>
                  <th className="px-3 py-2">Rated</th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((job) => {
                  const rated = data.acceptanceBySynthesisId[job.synthesisId]
                  return (
                    <tr
                      key={job.jobId}
                      className={`border-t border-paper-3 cursor-pointer hover:bg-paper-2/50 ${
                        selectedId === job.synthesisId ? 'bg-paper-2' : ''
                      }`}
                      onClick={() => selectJob(job)}
                    >
                      <td className="max-w-[200px] truncate px-3 py-2" title={job.topic ?? job.synthesisId}>
                        {job.topic ?? job.synthesisId.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2">{job.status}</td>
                      <td className="px-3 py-2">
                        {job.analyzedCount ?? '—'}/{job.voiceCount}
                        {job.failedCount ? ` (${job.failedCount} failed)` : ''}
                      </td>
                      <td className="px-3 py-2 text-xs">{job.engineVersion ?? '—'}</td>
                      <td className="px-3 py-2">{rated ? '✓' : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink">Rate synthesis</h2>
          {!form ? (
            <p className="mt-2 text-sm text-ink-soft">Select a job from the table.</p>
          ) : (
            <div className="mt-3 space-y-4 rounded-lg border border-paper-3 p-4">
              <p className="text-xs text-ink-soft">Synthesis: {form.synthesisId}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <RatingSelect
                  label="Individual analysis"
                  value={form.analysisQuality}
                  onChange={(v) => setForm({ ...form, analysisQuality: v })}
                />
                <RatingSelect
                  label="Agreement"
                  value={form.agreementQuality}
                  onChange={(v) => setForm({ ...form, agreementQuality: v })}
                />
                <RatingSelect
                  label="Divide"
                  value={form.divideQuality}
                  onChange={(v) => setForm({ ...form, divideQuality: v })}
                />
                <RatingSelect
                  label="Complementary"
                  value={form.complementaryQuality}
                  onChange={(v) => setForm({ ...form, complementaryQuality: v })}
                />
                <RatingSelect
                  label="Evidence"
                  value={form.evidenceQuality}
                  onChange={(v) => setForm({ ...form, evidenceQuality: v })}
                />
                <RatingSelect
                  label="Final synthesis"
                  value={form.synthesisQuality}
                  onChange={(v) => setForm({ ...form, synthesisQuality: v })}
                />
                <RatingSelect
                  label="Time saving vs watching"
                  value={form.timeSaving}
                  onChange={(v) => setForm({ ...form, timeSaving: v })}
                />
                <RatingSelect
                  label="Would use again"
                  value={form.wouldReuse}
                  onChange={(v) => setForm({ ...form, wouldReuse: v })}
                />
                <RatingSelect
                  label="Zero relationship (correct?)"
                  value={form.zeroRelationshipResult ?? 'partial'}
                  onChange={(v) => setForm({ ...form, zeroRelationshipResult: v })}
                />
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.missedRelationship}
                    onChange={(e) => setForm({ ...form, missedRelationship: e.target.checked })}
                  />
                  Important relationship missed?
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.falseRelationship}
                    onChange={(e) => setForm({ ...form, falseRelationship: e.target.checked })}
                  />
                  False relationship found?
                </label>
              </div>

              <div>
                <p className="text-xs text-ink-soft mb-2">Failure categories</p>
                <div className="flex flex-wrap gap-2">
                  {FAILURE_CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={failureCategories.includes(cat)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFailureCategories([...failureCategories, cat])
                          } else {
                            setFailureCategories(failureCategories.filter((c) => c !== cat))
                          }
                        }}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>

              <label className="block text-xs text-ink-soft">
                Notes
                <textarea
                  className="mt-1 w-full rounded border border-paper-3 bg-paper px-2 py-1 text-sm"
                  rows={3}
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save rating'}
                </button>
                {message && <span className="text-sm text-ink-soft">{message}</span>}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
