import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Create tiers table
    await sql`
      CREATE TABLE IF NOT EXISTS manufacturer_tiers (
        id SERIAL PRIMARY KEY,
        manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
        tier_name VARCHAR(100) NOT NULL,
        price_list_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `

    // 2. Add tier_id column to dealer_manufacturers (safe if already exists)
    await sql`
      ALTER TABLE dealer_manufacturers
      ADD COLUMN IF NOT EXISTS tier_id INTEGER REFERENCES manufacturer_tiers(id) ON DELETE SET NULL
    `

    // 3. Seed tiers for specified manufacturers
    const tierSeeds: [string, string[]][] = [
      ['Audix',         ['Dealer', 'Elite', 'Premier']],
      ['Symetrix',      ['Authorized', 'Certified', 'Preferred']],
      ['Powersoft',     ['Standard', 'Silver', 'Gold', 'Platinum']],
      ['OWI',           ['A', 'B']],
      ['Innovox Audio', ['Dealer', 'Partner']],
      ['Galaxy Audio',  ['Gold', 'Platinum']],
    ]

    let tiersCreated = 0
    for (const [mfrName, tiers] of tierSeeds) {
      const mfrs = await sql`SELECT id FROM manufacturers WHERE name = ${mfrName} LIMIT 1`
      if (!mfrs.length) continue
      const mfrId = (mfrs[0] as { id: number }).id

      for (let i = 0; i < tiers.length; i++) {
        await sql`
          INSERT INTO manufacturer_tiers (manufacturer_id, tier_name, sort_order)
          VALUES (${mfrId}, ${tiers[i]}, ${i})
          ON CONFLICT DO NOTHING
        `
        tiersCreated++
      }
    }

    return NextResponse.json({ success: true, tiers_created: tiersCreated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
