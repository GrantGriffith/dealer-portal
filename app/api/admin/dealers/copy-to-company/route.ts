import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'
import { sql, setDealerManufacturers } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealerId } = await req.json()
  if (!dealerId) return NextResponse.json({ error: 'dealerId required' }, { status: 400 })

  // Get source dealer's company
  const dealerRows = await sql`SELECT id, company FROM dealers WHERE id = ${dealerId} LIMIT 1`
  if (!dealerRows.length) return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })

  const { company } = dealerRows[0] as { company: string }
  if (!company?.trim()) {
    return NextResponse.json({ error: 'Dealer has no company set' }, { status: 400 })
  }

  // Get source dealer's manufacturer assignments (with tiers)
  const assignments = await sql`
    SELECT manufacturer_id, tier_id
    FROM dealer_manufacturers
    WHERE dealer_id = ${dealerId}
  ` as { manufacturer_id: number; tier_id: number | null }[]

  // Find all other dealers at the same company
  const companyDealers = await sql`
    SELECT id FROM dealers
    WHERE LOWER(TRIM(company)) = LOWER(TRIM(${company}))
      AND id != ${dealerId}
  ` as { id: number }[]

  if (companyDealers.length === 0) {
    return NextResponse.json({ updated: 0, company })
  }

  // Copy assignments to each dealer
  const mapped = assignments.map(a => ({
    manufacturerId: a.manufacturer_id,
    tierId: a.tier_id,
  }))

  await Promise.all(
    companyDealers.map(d => setDealerManufacturers(d.id, mapped))
  )

  return NextResponse.json({ updated: companyDealers.length, company })
}
