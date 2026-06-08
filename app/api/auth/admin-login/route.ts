import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'
import { getAdminByEmail } from '@/lib/db'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const admin = await getAdminByEmail(email)
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
    session.adminId = admin.id
    session.email = admin.email
    await session.save()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Admin login error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
