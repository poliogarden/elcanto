export type ImageGenerationInput = {
  prompt: string
  width?: number
  height?: number
  style?: string
}

export type GeneratedImage = {
  assetId: string
  url: string
  provider: string
}

export interface ImageGenerationProvider {
  generate(input: ImageGenerationInput): Promise<GeneratedImage>
}

export class OpenAIImageProvider implements ImageGenerationProvider {
  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const { getOpenAIClient } = await import('@/lib/ai/openai')
    const openai = getOpenAIClient()
    const size =
      input.width && input.height ? `${input.width}x${input.height}` : '1792x1024'

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: input.prompt,
      n: 1,
      size: size as '1024x1024' | '1792x1024' | '1024x1792',
    })

    const url = response.data?.[0]?.url
    if (!url) throw new Error('Image generation returned no URL')

    return { assetId: `img_${Date.now()}`, url, provider: 'openai-dall-e-3' }
  }
}

export function getImageGenerationProvider(): ImageGenerationProvider | null {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  return new OpenAIImageProvider()
}
