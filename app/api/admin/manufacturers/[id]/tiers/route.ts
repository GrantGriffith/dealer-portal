import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'
import { getTiersForManufacturer, createTier, updateTier, deleteTier } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tiers = await getTiersForManufacturer(parseInt(params.id))
  return NextResponse.json(tiers)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tierName, sortOrder } = await req.json()
  if (!tierName) return NextResponse.json({ error: 'tierName required' }, { status: 400 })
  const tier = await createTier(parseInt(params.id), tierName, sortOrder ?? 0)
  return NextResponse.json(tier)
}

export async function PATCH(req: NextRequest, _ctx: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tierId, priceListUrl, priceListEffectiveDate, tierName, sortOrder } = await req.json()
  const updated = await updateTier(tierId, {
    ...(tierName !== undefined && { tier_name: tierName }),
    ...(priceListUrl !== undefined && { price_list_url: priceListUrl }),
    ...(priceListEffectiveDate !== undefined && { price_list_effective_date: priceListEffectiveDate }),
    ...(sortOrder !== undefined && { sort_order: sortOrder }),
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, _ctx: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tierId } = await req.json()
  await deleteTier(tierId)
  return NextResponse.json({ ok: true })
}
