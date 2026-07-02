import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
})

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null
  const manufacturerId = formData.get('manufacturerId') as string | null

  if (!file || !type || !manufacturerId) {
    return NextResponse.json({ error: 'Missing file, type, or manufacturerId.' }, { status: 400 })
  }

  const tierId = formData.get('tierId') as string | null

  // Use only the last extension so double-extension files (e.g. file.xlsx.pdf) work correctly
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const folder = type === 'logo' ? 'logos' : 'pricelists'
  const key = tierId
    ? `${folder}/manufacturer-${manufacturerId}-tier-${tierId}-${Date.now()}.${ext}`
    : `${folder}/manufacturer-${manufacturerId}-${Date.now()}.${ext}`

  // Browsers sometimes send an empty content-type for unusual filenames — fall back by extension
  const MIME: Record<string, string> = {
    pdf:  'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls:  'application/vnd.ms-excel',
    csv:  'text/csv',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    gif:  'image/gif',
    webp: 'image/webp',
    svg:  'image/svg+xml',
  }
  const contentType = file.type || MIME[ext] || 'application/octet-stream'

  try {
    const bytes = await file.arrayBuffer()
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME ?? 'dealer-portal',
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: contentType,
    }))

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('R2 upload error:', err)
    return NextResponse.json({
      error: 'Upload failed',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
