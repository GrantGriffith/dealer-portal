import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Add column (safe if already exists)
    await sql`
      ALTER TABLE dealers
      ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100) DEFAULT 'Grant'
    `

    // Set all existing dealers to Grant
    const result = await sql`
      UPDATE dealers SET assigned_to = 'Grant' WHERE assigned_to IS NULL OR assigned_to = 'Grant'
    `

    const count = await sql`SELECT COUNT(*)::int AS n FROM dealers WHERE assigned_to = 'Grant'`
    const n = (count[0] as { n: number }).n

    return NextResponse.json({ success: true, dealers_assigned_to_grant: n })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
