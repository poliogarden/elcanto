export type VideoGenerationInput = {
  prompt: string
  durationSeconds?: number
  aspectRatio?: '16:9' | '9:16'
  referenceImageUrl?: string
  style?: string
  sceneMetadata?: Record<string, unknown>
}

export type GeneratedVideoClip = {
  assetId: string
  url: string
  provider: string
  durationSeconds: number
}

export type VideoProviderCapabilities = {
  textToVideo: boolean
  imageToVideo: boolean
  maxDurationSec: number
}

export interface VideoGenerationProvider {
  capabilities(): VideoProviderCapabilities
  generateClip(input: VideoGenerationInput): Promise<GeneratedVideoClip>
}

export class KineticTypographyVideoProvider implements VideoGenerationProvider {
  capabilities(): VideoProviderCapabilities {
    return { textToVideo: false, imageToVideo: false, maxDurationSec: 120 }
  }

  async generateClip(input: VideoGenerationInput): Promise<GeneratedVideoClip> {
    throw new Error(
      'Text-to-video not configured. Use kinetic typography / chart / image pipeline instead.',
    )
  }
}

export function getVideoGenerationProvider(): VideoGenerationProvider {
  return new KineticTypographyVideoProvider()
}
