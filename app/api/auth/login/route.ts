import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { getDealerByEmail } from '@/lib/db'
import { dealerSessionOptions, DealerSessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const dealer = await getDealerByEmail(email)
    if (!dealer) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, dealer.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const session = await getIronSession<DealerSessionData>(cookies(), dealerSessionOptions)
    session.dealerId = dealer.id
    session.email = dealer.email
    session.firstName = dealer.first_name
    session.lastName = dealer.last_name
    session.company = dealer.company
    await session.save()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
