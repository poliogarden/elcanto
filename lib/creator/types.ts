import { z } from 'zod'

export const PositionChangeKindSchema = z.enum([
  'CONSISTENT',
  'STRENGTHENED',
  'WEAKENED',
  'MODIFIED',
  'REVERSED',
])

export const AssetOriginTypeSchema = z.enum([
  'USER_UPLOAD',
  'CHANNEL_OWNED',
  'AI_GENERATED',
  'LICENSED_SOURCE',
  'SYSTEM_GENERATED',
])

export const VisualTypeSchema = z.enum([
  'kinetic_typography',
  'static_image',
  'generated_image',
  'generated_video',
  'channel_footage',
  'chart',
  'color_background',
  'b_roll',
])

export const VideoFormatSchema = z.enum(['16:9', '9:16'])

export const ProjectStageSchema = z.enum([
  'research',
  'angle',
  'outline',
  'script',
  'scenes',
  'timeline',
  'preview',
  'publish',
])

export const ProjectStatusSchema = z.enum([
  'draft',
  'generating',
  'ready',
  'rendering',
  'published',
  'failed',
])

export const RenderJobStatusSchema = z.enum([
  'QUEUED',
  'PREPARING_ASSETS',
  'GENERATING_AUDIO',
  'COMPOSING',
  'RENDERING',
  'UPLOADING',
  'READY',
  'FAILED',
  'CANCELLED',
])

export const CreatorChannelSchema = z.object({
  id: z.string(),
  userId: z.string(),
  youtubeChannelId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  subscriberCount: z.number().nullable(),
  videoCount: z.number().nullable(),
  indexingStatus: z.enum(['pending', 'indexing', 'ready', 'failed', 'partial']),
  indexingProgress: z.object({
    phase: z.string(),
    imported: z.number(),
    analyzed: z.number(),
    total: z.number(),
    message: z.string().optional(),
  }),
  brandKit: z
    .object({
      logoUrl: z.string().nullable().optional(),
      captionStyle: z.string().optional(),
      voiceProfileId: z.string().optional(),
      introAssetId: z.string().optional(),
      outroAssetId: z.string().optional(),
    })
    .optional(),
  styleProfile: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isSample: z.boolean().optional(),
})

export const CreatorPositionSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  videoId: z.string(),
  topicId: z.string().nullable(),
  label: z.string(),
  statement: z.string(),
  evidenceRef: z.string(),
  timestamp: z.number(),
  endTime: z.number().optional(),
  publishedAt: z.string().optional(),
})

export const CreatorTopicSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  videoIds: z.array(z.string()),
})

export const CreatorOpenLoopSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  label: z.string(),
  description: z.string(),
  sourceVideoId: z.string().optional(),
  sourceTimestamp: z.number().optional(),
})

export const ContentOpportunitySchema = z.object({
  id: z.string(),
  channelId: z.string(),
  title: z.string(),
  thesis: z.string(),
  whyNow: z.array(z.string()),
  linkedTopicIds: z.array(z.string()),
  linkedPositionIds: z.array(z.string()),
  linkedOpenLoopIds: z.array(z.string()),
  strength: z.number().min(0).max(1),
})

export const ChannelBrainSchema = z.object({
  channelId: z.string(),
  topics: z.array(CreatorTopicSchema),
  positions: z.array(CreatorPositionSchema),
  openLoops: z.array(CreatorOpenLoopSchema),
  opportunities: z.array(ContentOpportunitySchema),
  builtAt: z.string(),
})

export const VisualAssetSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  sceneId: z.string().optional(),
  originType: AssetOriginTypeSchema,
  mimeType: z.string(),
  fileName: z.string(),
  publicUrl: z.string(),
  provider: z.string().optional(),
  costTier: z.enum(['free', 'low', 'medium', 'high']).optional(),
  prompt: z.string().optional(),
  createdAt: z.string(),
})

export const VoiceProfileSchema = z.object({
  id: z.string(),
  provider: z.enum(['openai', 'system']),
  voiceId: z.string(),
  language: z.string(),
  speed: z.number().default(1),
  style: z.string().optional(),
  sampleRate: z.number().optional(),
})

export const GenerationCostEstimateSchema = z.object({
  generatedImages: z.number().default(0),
  generatedVideos: z.number().default(0),
  ttsWords: z.number().default(0),
  estimatedDurationSec: z.number().default(0),
  sceneRenders: z.number().default(0),
})

export const SceneSchema = z.object({
  sceneId: z.string(),
  order: z.number(),
  durationTargetSec: z.number(),
  scriptText: z.string(),
  voiceText: z.string(),
  visualIntent: z.string(),
  visualType: VisualTypeSchema,
  captionText: z.string(),
  transition: z.enum(['cut', 'fade']).default('cut'),
  visualAssetId: z.string().nullable().optional(),
  voiceAssetId: z.string().nullable().optional(),
  sceneRenderPath: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const TimelineTrackSchema = z.object({
  type: z.enum(['video', 'voice', 'music', 'caption']),
  clips: z.array(
    z.object({
      id: z.string(),
      sceneId: z.string().optional(),
      startSec: z.number(),
      endSec: z.number(),
      assetId: z.string().optional(),
      label: z.string().optional(),
      volume: z.number().optional(),
    }),
  ),
})

export const TimelineSchema = z.object({
  duration: z.number(),
  format: VideoFormatSchema,
  tracks: z.array(TimelineTrackSchema),
})

export const VideoProjectSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  userId: z.string(),
  topic: z.string(),
  objective: z.string().nullable(),
  stage: ProjectStageSchema,
  status: ProjectStatusSchema,
  format: VideoFormatSchema.default('16:9'),
  research: z.unknown().nullable(),
  angle: z.unknown().nullable(),
  angles: z.array(z.unknown()).optional(),
  outline: z.unknown().nullable(),
  script: z.unknown().nullable(),
  titles: z.array(z.unknown()).optional(),
  thumbnailConcepts: z.array(z.unknown()).optional(),
  description: z.string().nullable().optional(),
  scenes: z.array(SceneSchema).default([]),
  visualAssets: z.array(z.unknown()).default([]),
  voiceTrack: z.unknown().nullable().optional(),
  backgroundMusic: z.unknown().nullable().optional(),
  captions: z.unknown().nullable().optional(),
  timeline: TimelineSchema.nullable().optional(),
  renderJobs: z.array(z.string()).default([]),
  renderVersions: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        renderJobId: z.string(),
        outputUrl: z.string().nullable(),
        createdAt: z.string(),
      }),
    )
    .default([]),
  linkedVideos: z.array(z.string()).default([]),
  linkedPositionIds: z.array(z.string()).default([]),
  linkedClaims: z.array(z.string()).default([]),
  decisions: z.array(z.unknown()).default([]),
  generationCost: GenerationCostEstimateSchema.optional(),
  voiceProfileId: z.string().optional(),
  publishing: z.unknown().nullable().optional(),
  analytics: z.unknown().nullable().optional(),
  invalidation: z.record(z.string(), z.boolean()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const ProjectMutationSchema = z.object({
  artifact: z.string(),
  target: z.string().optional(),
  operation: z.enum(['replace', 'append', 'delete', 'patch']),
  value: z.unknown().optional(),
  reason: z.string().optional(),
})

export const AiMutationResponseSchema = z.object({
  message: z.string(),
  mutations: z.array(ProjectMutationSchema),
})

export type VisualAsset = z.infer<typeof VisualAssetSchema>
export type VoiceProfile = z.infer<typeof VoiceProfileSchema>
export type GenerationCostEstimate = z.infer<typeof GenerationCostEstimateSchema>
export type AssetOriginType = z.infer<typeof AssetOriginTypeSchema>
export type CreatorPosition = z.infer<typeof CreatorPositionSchema>
export type CreatorTopic = z.infer<typeof CreatorTopicSchema>
export type CreatorOpenLoop = z.infer<typeof CreatorOpenLoopSchema>
export type ContentOpportunity = z.infer<typeof ContentOpportunitySchema>
export type ChannelBrain = z.infer<typeof ChannelBrainSchema>
export type Scene = z.infer<typeof SceneSchema>
export type Timeline = z.infer<typeof TimelineSchema>
export type VideoFormat = z.infer<typeof VideoFormatSchema>
export type VideoProject = z.infer<typeof VideoProjectSchema>
export type ProjectMutation = z.infer<typeof ProjectMutationSchema>
