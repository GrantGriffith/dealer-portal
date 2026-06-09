import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Delete duplicate manufacturers, keeping the lowest id for each name
    await sql`
      DELETE FROM manufacturers
      WHERE id NOT IN (
        SELECT MIN(id) FROM manufacturers GROUP BY name
      )
    `
    const rows = await sql`SELECT COUNT(*)::int AS count FROM manufacturers`
    return NextResponse.json({ success: true, manufacturers_remaining: (rows[0] as { count: number }).count })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
