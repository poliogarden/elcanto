import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET = process.env.RENDER_STORAGE_BUCKET ?? 'render-outputs'

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url, key }
}

function getS3Client() {
  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!region || !accessKeyId || !secretAccessKey) return null
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
}

export async function uploadRenderFile(jobId, filename, body, contentType) {
  const path = `renders/${jobId}/${filename}`

  const supabase = getSupabaseConfig()
  if (supabase) {
    const res = await fetch(`${supabase.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabase.key}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body,
    })
    if (res.ok) {
      return {
        url: `${supabase.url}/storage/v1/object/public/${BUCKET}/${path}`,
        provider: 'supabase',
        path,
      }
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
