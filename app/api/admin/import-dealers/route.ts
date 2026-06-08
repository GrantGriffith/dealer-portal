import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { createDealer } from '@/lib/db'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

// Accepts JSON array of { firstName, lastName, email, company }
// Creates dealer accounts with the shared default password (inactive by default)
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealers, defaultPassword } = await req.json()

  if (!Array.isArray(dealers) || !defaultPassword) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(defaultPassword, 12)
  let created = 0
  let skipped = 0

  for (const d of dealers) {
    if (!d.email || !d.firstName) { skipped++; continue }
    try {
      const result = await createDealer(d.firstName, d.lastName || '', d.email, d.company || '', hash, false)
      if (result) created++
      else skipped++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ created, skipped })
}
