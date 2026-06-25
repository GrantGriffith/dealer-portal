import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { createDealer, updateDealer } from '@/lib/db'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  return session.adminId ? session : null
}

// Accepts: { dealers: [{ firstName, lastName, email, company, assignedTo? }], defaultPassword, assignedTo? }
// assignedTo on the batch sets the default for all dealers; per-dealer assignedTo overrides it.
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealers, defaultPassword, assignedTo: batchAssignedTo = 'Grant' } = await req.json()

  if (!Array.isArray(dealers) || !defaultPassword) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(defaultPassword, 12)
  let created = 0
  let skipped = 0

  for (const d of dealers) {
    if (!d.email || !d.firstName) { skipped++; continue }
    try {
      const result = await createDealer(
        d.firstName, d.lastName || '', d.email, d.company || '', hash, false
      )
      if (result) {
        const rep = d.assignedTo || batchAssignedTo
        if (rep && rep !== 'Grant') {
          await updateDealer(result.id, { assigned_to: rep })
        }
        created++
      } else {
        skipped++
      }
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ created, skipped })
}
