import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

// POST { ids: number[] } — activate specific dealers
// POST { all: true }    — activate all dealers
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.all === true) {
    await sql`UPDATE dealers SET is_active = true WHERE is_active = false`
    const rows = await sql`SELECT COUNT(*)::int AS count FROM dealers WHERE is_active = true`
    const count = (rows as unknown as { count: number }[])[0]?.count ?? 0
    return NextResponse.json({ activated: count })
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const ids: number[] = body.ids.map(Number).filter(Boolean)
    await sql`UPDATE dealers SET is_active = true WHERE id = ANY(${ids})`
    return NextResponse.json({ activated: ids.length })
  }

  return NextResponse.json({ error: 'Provide ids[] or all:true' }, { status: 400 })
}
