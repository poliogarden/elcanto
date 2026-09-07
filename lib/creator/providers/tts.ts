import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { synthesizeInterludeSpeech, estimateSpeechDuration } from '@/lib/compose/interlude-tts'
import { creatorAssetDir } from '@/lib/creator/storage/local-store'

function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export type SceneSpeechResult = {
  assetId: string
  filePath: string
  publicUrl: string
  durationSeconds: number
}

/** Minimal silent MP3 frame header + padding — valid enough for FFmpeg mux. */
function buildSilentMp3(durationSec: number): Buffer {
  const frames = Math.max(1, Math.ceil(durationSec))
  const frame = Buffer.from([
    0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ])
  return Buffer.concat(Array.from({ length: frames * 4 }, () => frame))
}

async function synthesizeSilentSpeech(
  text: string,
  projectId: string,
): Promise<SceneSpeechResult> {
  const durationSeconds = estimateSpeechDuration(text)
  const assetId = `voice_silent_${Date.now()}`
  const dir = creatorAssetDir(projectId)
  await mkdir(dir, { recursive: true })
  const fileName = `${assetId}.mp3`
  const filePath = path.join(dir, fileName)
  await writeFile(filePath, buildSilentMp3(durationSeconds))
  return {
    assetId,
    filePath,
    publicUrl: `/api/creator/assets/${projectId}/${fileName}`,
    durationSeconds,
  }
}

export async function synthesizeSceneSpeech(
  text: string,
  projectId: string,
): Promise<SceneSpeechResult> {
  const trimmed = text.trim().slice(0, 800)
  if (!trimmed) return synthesizeSilentSpeech('...', projectId)

  if (!hasOpenAIKey()) {
    return synthesizeSilentSpeech(trimmed, projectId)
  }

  try {
    const result = await synthesizeInterludeSpeech(trimmed)
    const assetId = `voice_${Date.now()}`
    const dir = creatorAssetDir(projectId)
    await mkdir(dir, { recursive: true })
    const fileName = `${assetId}.mp3`
    const filePath = path.join(dir, fileName)
    await writeFile(filePath, result.audio)
    return {
      assetId,
      filePath,
      publicUrl: `/api/creator/assets/${projectId}/${fileName}`,
      durationSeconds: result.durationSeconds,
    }
  } catch {
    return synthesizeSilentSpeech(trimmed, projectId)
  }
}
