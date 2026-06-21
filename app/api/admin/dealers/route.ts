import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { getAllDealers, createDealer, updateDealer } from '@/lib/db'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

async function requireAdmin() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  if (!session.adminId) return null
  return session
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dealers = await getAllDealers()
  return NextResponse.json(dealers)
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { firstName, lastName, email, company, password, isActive, assignedTo } = await req.json()

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  let dealer = await createDealer(firstName, lastName, email, company || '', hash, isActive ?? false)

  if (!dealer) {
    return NextResponse.json({ error: 'A dealer with that email already exists.' }, { status: 409 })
  }

  // Set assigned_to if provided
  if (assignedTo && assignedTo !== 'Grant') {
    dealer = await updateDealer(dealer.id, { assigned_to: assignedTo }) ?? dealer
  }

  return NextResponse.json(dealer, { status: 201 })
}
