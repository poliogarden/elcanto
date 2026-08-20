import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const RENDER_BUCKET = process.env.RENDER_STORAGE_BUCKET ?? 'render-outputs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function getS3Client(): S3Client | null {
  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!region || !accessKeyId || !secretAccessKey) return null
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
}

export type UploadResult = {
  url: string
  provider: 'supabase' | 's3' | 'local'
  path: string
}

export async function uploadRenderFile(
  jobId: string,
  filename: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult | null> {
  const path = `renders/${jobId}/${filename}`

  const supabase = getSupabase()
  if (supabase) {
    const { error } = await supabase.storage.from(RENDER_BUCKET).upload(path, body, {
      contentType,
      upsert: true,
    })
    if (!error) {
      const { data } = supabase.storage.from(RENDER_BUCKET).getPublicUrl(path)
      return { url: data.publicUrl, provider: 'supabase', path }
    }
  }

  const s3 = getS3Client()
  const bucket = process.env.AWS_S3_BUCKET
  if (s3 && bucket) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: body,
        ContentType: contentType,
      }),
    )
    const base = process.env.AWS_S3_PUBLIC_URL ?? `https://${bucket}.s3.amazonaws.com`
    return { url: `${base.replace(/\/$/, '')}/${path}`, provider: 's3', path }
  }

  return null
}

export function getRenderStorageBucket(): string {
  return RENDER_BUCKET
}
