import type { PatternView, RelationshipView, SourceReasoningView } from '@/lib/types/view-model'

function Connector() {
  return (
    <div className="flex justify-center py-2">
      <div className="h-8 w-px bg-line" />
    </div>
  )
}

function StrengthBadge({ label, strength }: { label: string; strength: number }) {
  const isDebug = process.env.NEXT_PUBLIC_SYNTHESIS_DEBUG === 'true'
  return (
    <span className="mono-label text-[10px] text-ink-soft">
      {label}
      {isDebug && ` · ${strength.toFixed(2)}`}
    </span>
  )
}

function ClaimCard({ claim, sourceLabel }: { claim: { id: string; statement: string }; sourceLabel: string }) {
  return (
    <div className="border border-line bg-background p-4">
      <span className="mono-label text-[10px] text-ink-soft">{sourceLabel}</span>
      <p className="mt-2 font-serif text-base leading-relaxed">{claim.statement}</p>
    </div>
  )
}

function RelationshipCard({ rel }: { rel: RelationshipView }) {
  return (
    <div className="border border-line p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label text-[10px] text-ink">{rel.typeLabel.toUpperCase()}</span>
        <StrengthBadge label={rel.strengthLabel} strength={rel.strength} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ClaimCard claim={{ id: rel.fromClaimId, statement: rel.fromClaim }} sourceLabel={rel.fromTitle} />
        <ClaimCard claim={{ id: rel.toClaimId, statement: rel.toClaim }} sourceLabel={rel.toTitle} />
      </div>

      <p className="mt-4 font-serif text-sm leading-relaxed text-ink-soft">{rel.explanation}</p>
    </div>
  )
}

function PatternCard({ pattern }: { pattern: PatternView }) {
  return (
    <div className="border border-line bg-mint/30 p-5">
      <span className="mono-label text-[10px] text-ink-soft">CROSS-SOURCE PATTERN</span>
      <h4 className="mt-2 font-serif text-xl font-medium">{pattern.label}</h4>
      <p className="mt-2 font-serif text-base leading-relaxed">{pattern.description}</p>
    </div>
  )
}

function SourceClaimsColumn({ source }: { source: SourceReasoningView }) {
  return (
    <div className="border border-line p-5">
      <span className="mono-label text-[10px] text-ink-soft">
        SOURCE {String(source.voice).padStart(2, '0')}
      </span>
      <h4 className="mt-2 font-serif text-lg font-medium leading-tight">{source.title}</h4>
      <div className="mt-4 space-y-3">
        {source.coreClaims.map((claim) => (
          <div key={claim.id} className="border-l-2 border-line pl-3">
            <p className="font-serif text-sm leading-relaxed">{claim.statement}</p>
          </div>
        ))}
        {source.coreClaims.length === 0 && (
          <p className="mono text-[11px] text-ink-soft">No claims selected for synthesis.</p>
        )}
      </div>
    </div>
  )
}

export function SynthesisMap({
  sources,
  relationships,
  independentRelationships,
  patterns,
  noStrongRelationship,
}: {
  sources: SourceReasoningView[]
  relationships: RelationshipView[]
  independentRelationships: RelationshipView[]
  patterns: PatternView[]
  noStrongRelationship: boolean
}) {
  return (
    <section className="border-b border-line px-5 py-8 md:px-8 md:py-10">
      <div className="mb-8 border-b border-line pb-4">
        <span className="mono-label text-xs text-ink-soft">02 / HOW THESE CONNECT</span>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
          Synthesis map
        </h2>
        <p className="mono-label mt-2 text-xs text-ink-soft">
          Claim → Relationship → Pattern — not a keyword graph
        </p>
      </div>

      {/* Source claims */}
      <div className="mb-8">
        <h3 className="mono-label mb-4 text-[11px] text-ink">Source claims used</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <SourceClaimsColumn key={source.sourceId} source={source} />
          ))}
        </div>
      </div>

      <Connector />

      {/* Relationships */}
      <div className="mb-8">
        <h3 className="mono-label mb-4 text-[11px] text-ink">Relationships discovered</h3>
        {relationships.length > 0 ? (
          <div className="space-y-4">
            {relationships.map((rel) => (
              <RelationshipCard key={rel.id} rel={rel} />
            ))}
          </div>
        ) : noStrongRelationship ? (
          <div className="border border-line p-6 text-center">
            <p className="mono-label text-[11px] text-ink-soft">
              NO STRONG CROSS-SOURCE RELATIONSHIP FOUND
            </p>
            <p className="mt-2 font-serif text-base text-ink-soft">
              These sources do not share a meaningful argument to compare.
            </p>
          </div>
        ) : (
          <p className="mono text-[11px] text-ink-soft">No displayable relationships.</p>
        )}
      </div>

      {/* Independent */}
      {independentRelationships.length > 0 && (
        <div className="mb-8">
          <h3 className="mono-label mb-4 text-[11px] text-ink-soft">Independent threads</h3>
          <div className="space-y-3">
            {independentRelationships.slice(0, 6).map((rel) => (
              <div key={rel.id} className="border border-dashed border-line p-4">
                <div className="flex items-center justify-between">
                  <span className="mono-label text-[10px] text-ink-soft">NO MEANINGFUL CONNECTION</span>
                  <StrengthBadge label="INDEPENDENT" strength={rel.strength} />
                </div>
                <p className="mt-2 font-serif text-sm text-ink-soft">
                  {rel.fromTitle} ↔ {rel.toTitle}: {rel.explanation}
                </p>
              </div>
            ))}
            {independentRelationships.length > 6 && (
              <p className="mono text-[11px] text-ink-soft">
                +{independentRelationships.length - 6} more independent pairs
              </p>
            )}
          </div>
        </div>
      )}

      {/* Patterns */}
      {patterns.length > 0 && (
        <>
          <Connector />
          <div>
            <h3 className="mono-label mb-4 text-[11px] text-ink">Cross-source patterns</h3>
            <div className="space-y-4">
              {patterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
