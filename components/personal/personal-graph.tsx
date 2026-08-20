'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { saveDraft } from '@/lib/storage/synthesis-session'
import { clusterToDraftVoices } from '@/lib/personal/cluster-synthesis'
import { PersonalGraphCanvas } from '@/components/personal/personal-graph-canvas'
import type { PersonalCluster, PersonalGraphEdge, PersonalGraphNode } from '@/lib/types/personal'

type Props = {
  clusters: PersonalCluster[]
  graphNodes: PersonalGraphNode[]
  graphEdges: PersonalGraphEdge[]
}

export function PersonalGraph({ clusters, graphNodes, graphEdges = [] }: Props) {
  const router = useRouter()
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)
  const [selectedTopicLabel, setSelectedTopicLabel] = useState<string | null>(null)

  const selectedCluster =
    clusters.find((c) => c.id === selectedClusterId) ??
    clusters.find((c) => c.topic === selectedTopicLabel || c.label.toLowerCase() === selectedTopicLabel) ??
    null

  function synthesizeCluster(cluster: PersonalCluster) {
    const voices = clusterToDraftVoices(cluster)
    if (voices.length === 0) {
      alert('This cluster has no YouTube videos to synthesize.')
      return
    }

    const id = crypto.randomUUID()
    saveDraft(id, voices)
    router.push(`/synthesize/${id}`)
  }

  function selectTopic(label: string) {
    setSelectedTopicLabel(label)
    const match = clusters.find((c) => c.topic === label || c.label.toLowerCase() === label)
    if (match) setSelectedClusterId(match.id)
  }

  return (
    <div className="space-y-8">
      <PersonalGraphCanvas
        nodes={graphNodes}
        edges={graphEdges}
        onSelectTopic={selectTopic}
        selectedTopicLabel={selectedTopicLabel}
      />

      {clusters.length > 0 && (
        <div>
          <h3 className="mono-label text-[10px] text-ink-soft">CLUSTERS</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {clusters.map((cluster) => (
              <article
                key={cluster.id}
                className={`border p-5 transition-colors ${
                  selectedClusterId === cluster.id ? 'border-ink' : 'border-line'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClusterId(cluster.id)
                    setSelectedTopicLabel(cluster.topic)
                  }}
                  className="w-full text-left"
                >
                  <span className="mono-label text-[10px] text-ink-soft">
                    {cluster.sourceCount} signals · {cluster.videos.length} videos
                  </span>
                  <h3 className="mt-2 font-serif text-xl font-medium">{cluster.label}</h3>
                </button>
                {cluster.videos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => synthesizeCluster(cluster)}
                    className="mono-label mt-4 border border-line px-3 py-2 text-[10px] hover:bg-ink hover:text-background"
                  >
                    Synthesize {Math.min(cluster.videos.length, 8)} sources →
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedCluster && selectedCluster.videos.length > 0 && (
        <div className="border border-line p-5">
          <p className="mono-label text-[10px] text-ink-soft">SELECTED CLUSTER</p>
          <h3 className="mt-2 font-serif text-2xl font-medium">{selectedCluster.label}</h3>
          <ul className="mt-4 space-y-2">
            {selectedCluster.videos.slice(0, 5).map((v) => (
              <li key={v.signalId} className="font-serif text-sm text-ink-soft">
                {v.title}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => synthesizeCluster(selectedCluster)}
            className="mono-label mt-6 border border-ink bg-ink px-4 py-3 text-[11px] text-background hover:opacity-90"
          >
            Synthesize this cluster →
          </button>
        </div>
      )}
    </div>
  )
}
