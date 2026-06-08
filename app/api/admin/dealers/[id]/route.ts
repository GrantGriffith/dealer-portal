import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import {
  getDealerById, updateDealer, deleteDealer,
  getDealerManufacturers, setDealerManufacturers,
} from '@/lib/db'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(params.id)
  const dealer = await getDealerById(id)
  if (!dealer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const manufacturers = await getDealerManufacturers(id)
  return NextResponse.json({ ...dealer, manufacturers })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(params.id)
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.firstName !== undefined)  updates.first_name = body.firstName
  if (body.lastName !== undefined)   updates.last_name = body.lastName
  if (body.company !== undefined)    updates.company = body.company
  if (body.isActive !== undefined)   updates.is_active = body.isActive
  if (body.password) {
    updates.password_hash = await bcrypt.hash(body.password, 12)
  }

  const updated = await updateDealer(id, updates as Parameters<typeof updateDealer>[1])

  // Update manufacturer access if provided
  if (Array.isArray(body.manufacturerIds)) {
    await setDealerManufacturers(id, body.manufacturerIds.map(Number))
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = parseInt(params.id)
  await deleteDealer(id)
  return NextResponse.json({ ok: true })
}
