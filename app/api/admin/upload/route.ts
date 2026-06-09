import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return !!session.adminId
}

// Called twice by @vercel/blob/client:
// 1. type=blob.generate-client-token → returns a short-lived upload token
// 2. type=blob.upload-completed → called by Vercel after upload finishes (webhook)
export async function POST(req: NextRequest) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
          ],
          tokenPayload: clientPayload ?? '',
        }
      },
      onUploadCompleted: async () => {
        // DB update is handled client-side after upload completes
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (err) {
    console.error('Upload handler error:', err)
    return NextResponse.json(
      { error: 'Upload failed', details: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    )
  }
}
