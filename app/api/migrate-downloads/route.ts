import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS download_logs (
        id SERIAL PRIMARY KEY,
        dealer_id INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
        manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
        tier_id INTEGER REFERENCES manufacturer_tiers(id) ON DELETE SET NULL,
        downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS download_logs_dealer_idx ON download_logs(dealer_id)`
    await sql`CREATE INDEX IF NOT EXISTS download_logs_downloaded_at_idx ON download_logs(downloaded_at DESC)`

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
