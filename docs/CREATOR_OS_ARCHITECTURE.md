# Creator OS Architecture

## Product Loop

```
CHANNEL → MEMORY → DECISION → PROJECT → CONTENT → VIDEO → PUBLISH → PERFORMANCE → LEARNING → NEXT DECISION
```

## Core Differentiators (Moat)

1. **Persistent Channel Brain** — `.data/creator/channels/{id}/brain.json` + `memory.json`
2. **Position / Claim History** — `intelligence/position-history.ts`
3. **Open Loop Intelligence** — brain `openLoops` + opportunity linking
4. **Decision → Action → Outcome → Learning** — `project/decision-log.ts` + `intelligence/learning-loop.ts`
5. **Conversation → Project Mutation** — `mutation/apply-mutation.ts` + invalidation graph

## Data Flow

```
YouTube API / Demo Seed
    ↓
channel-index-runner → analyzeOneSource (reuse elcanto pipeline)
    ↓
build-channel-brain → topics, positions, openLoops
    ↓
seedDemoChannelMemory → positionHistory, audienceQuestions, learnings
    ↓
opportunity-engine → ranked opportunities with signals
    ↓
Creator Home → Why this? → Start video / auto-video
    ↓
runFullVideoPipeline → scenes → visuals → voice → captions → timeline
    ↓
render-server.mjs → MP4
    ↓
publish-prep → metadata
    ↓
(future) analytics → learning-loop → opportunity strength
```

## Storage Layout

```
.data/creator/
  channels/{channelId}/
    channel.json      # CreatorChannel
    brain.json        # ChannelBrain
    memory.json       # ChannelMemory (history, audience, learnings)
    opportunities.json
  projects/{projectId}/
    project.json      # VideoProject (all artifacts)
    versions.json     # Artifact version snapshots
    events.jsonl      # Audit trail
    assets/           # voice, charts, visuals
  render-jobs/{jobId}.json
```

## AI Mutation Pipeline

```
User NL command
  → context-retrieval (scoped, not full brain)
  → apply-mutation (regex + rules)
  → snapshotArtifact (undo)
  → recordDecision
  → invalidation-graph
  → partial regenerate (affected scenes only)
  → persist project.json
```

## Video Pipeline

```
Script → Scene Planner → Asset Planner → Visual Resolver
  → TTS → Captions → Music → Timeline → Render Manifest v2
  → FFmpeg worker (per-scene segments → concat)
```

Timeline is source of truth for preview and final render.

## Provider Adapters

| Layer | Module |
|-------|--------|
| LLM | `lib/ai/structured-call.ts` |
| TTS | `lib/creator/providers/tts.ts` |
| Image | `lib/creator/providers/image-generation.ts` |
| Video | `lib/creator/providers/video-generation.ts` (capability interface) |
| Render | `worker/render-server.mjs` |

## Security

- `resolveCreatorUserId()` + `getProjectForUser()` ownership checks
- Sample channel (`isSample`) readable by all demo users
- Provider secrets server-only
- Supabase RLS in `supabase/creator-schema.sql` (when migrated)

## Legacy Isolation

- Deep synthesis: `/legacy`, `lib/direct-synthesis/`
- Creator OS: `/creator`, `lib/creator/`
- No legacy terminology in Creator UI
