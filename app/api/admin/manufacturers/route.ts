import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { getAllManufacturers, createManufacturer } from '@/lib/db'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const manufacturers = await getAllManufacturers()
  return NextResponse.json(manufacturers)
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, category, logoUrl, priceListUrl } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const m = await createManufacturer(name, category || '', logoUrl, priceListUrl)
  return NextResponse.json(m, { status: 201 })
}
