import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { updateManufacturer, deleteManufacturer } from '@/lib/db'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(params.id)
  const { name, category, logoUrl, priceListUrl } = await req.json()

  const updated = await updateManufacturer(id, {
    ...(name !== undefined && { name }),
    ...(category !== undefined && { category }),
    ...(logoUrl !== undefined && { logo_url: logoUrl }),
    ...(priceListUrl !== undefined && { price_list_url: priceListUrl }),
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteManufacturer(parseInt(params.id))
  return NextResponse.json({ ok: true })
}
