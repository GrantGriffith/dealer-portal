import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
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
  // Disable automatic checksum injection — checksums in presigned PUT URLs
  // require the browser to compute and send matching checksum headers, which
  // a plain fetch() cannot do and breaks CORS preflight negotiation.
  requestChecksumCalculation: 'WHEN_REQUIRED' as never,
  responseChecksumValidation: 'WHEN_REQUIRED' as never,
})

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

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileName, fileType, type, manufacturerId, tierId } = await req.json()

  if (!fileName || !type || !manufacturerId) {
    return NextResponse.json({ error: 'Missing fileName, type, or manufacturerId' }, { status: 400 })
  }

  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const folder = type === 'logo' ? 'logos' : 'pricelists'
  const key = tierId
    ? `${folder}/manufacturer-${manufacturerId}-tier-${tierId}-${Date.now()}.${ext}`
    : `${folder}/manufacturer-${manufacturerId}-${Date.now()}.${ext}`

  const contentType = fileType || MIME[ext] || 'application/octet-stream'

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME ?? 'dealer-portal',
      Key: key,
      ContentType: contentType,
    })
    // Presigned URL valid for 15 minutes — browser PUTs directly to R2, bypassing Vercel's body limit
    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 900 })
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ presignedUrl, publicUrl, contentType })
  } catch (err) {
    console.error('Presign error:', err)
    return NextResponse.json({
      error: 'Failed to generate upload URL',
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
