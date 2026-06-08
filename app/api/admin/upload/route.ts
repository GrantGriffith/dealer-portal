import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { put } from '@vercel/blob'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null // 'logo' or 'pricelist'
  const manufacturerId = formData.get('manufacturerId') as string | null

  if (!file || !type || !manufacturerId) {
    return NextResponse.json({ error: 'Missing file, type, or manufacturerId.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const folder = type === 'logo' ? 'logos' : 'pricelists'
  const filename = `${folder}/manufacturer-${manufacturerId}-${Date.now()}.${ext}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  })

  return NextResponse.json({ url: blob.url })
}
