import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { dealerSessionOptions, DealerSessionData } from '@/lib/session'

export async function POST() {
  const session = await getIronSession<DealerSessionData>(cookies(), dealerSessionOptions)
  session.destroy()
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
}

export async function GET() {
  const session = await getIronSession<DealerSessionData>(cookies(), dealerSessionOptions)
  session.destroy()
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
}
