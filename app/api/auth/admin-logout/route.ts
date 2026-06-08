import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'

export async function POST() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  session.destroy()
  return NextResponse.redirect(new URL('/admin', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
}
