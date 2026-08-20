import { buildRenderManifest, type RenderManifest } from '@/lib/compose/render-manifest'
import type { Composition } from '@/lib/types/composition'
import { synthesizeInterludeSpeech } from '@/lib/compose/interlude-tts'
import { uploadRenderFile } from '@/lib/compose/render-upload'
import { saveRenderAsset } from '@/lib/compose/render-asset-store'

export async function prepareRenderManifest(
  compositionId: string,
  composition: Composition,
  jobId: string,
): Promise<RenderManifest> {
  const manifest = buildRenderManifest(compositionId, composition)

  if (manifest.interludes.length === 0) return manifest

  const interludes = []
  for (const interlude of manifest.interludes) {
    try {
      const speech = await synthesizeInterludeSpeech(interlude.text)
      const filename = `interlude-${interlude.id}.mp3`
      await saveRenderAsset(jobId, filename, speech.audio)

      const uploaded = await uploadRenderFile(jobId, filename, speech.audio, 'audio/mpeg')
      const localUrl = `/api/files/render/${jobId}/${filename}`

      interludes.push({
        ...interlude,
        durationSeconds: Math.max(interlude.durationSeconds, speech.durationSeconds),
        audioUrl: uploaded?.url ?? localUrl,
      })
    } catch (error) {
      console.error('[RENDER] interlude TTS failed', interlude.id, error)
      interludes.push(interlude)
    }
  }

  return { ...manifest, interludes }
}
