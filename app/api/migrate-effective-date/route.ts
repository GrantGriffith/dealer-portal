import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await sql`ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS price_list_effective_date DATE`
    await sql`ALTER TABLE manufacturer_tiers ADD COLUMN IF NOT EXISTS price_list_effective_date DATE`

    // Set all existing price lists to July 2026
    await sql`UPDATE manufacturers SET price_list_effective_date = '2026-07-01' WHERE price_list_url IS NOT NULL AND price_list_effective_date IS NULL`
    await sql`UPDATE manufacturer_tiers SET price_list_effective_date = '2026-07-01' WHERE price_list_url IS NOT NULL AND price_list_effective_date IS NULL`

    const mCount = await sql`SELECT COUNT(*)::int AS n FROM manufacturers WHERE price_list_effective_date IS NOT NULL`
    const tCount = await sql`SELECT COUNT(*)::int AS n FROM manufacturer_tiers WHERE price_list_effective_date IS NOT NULL`

    return NextResponse.json({
      success: true,
      manufacturers_dated: (mCount[0] as { n: number }).n,
      tiers_dated: (tCount[0] as { n: number }).n,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
