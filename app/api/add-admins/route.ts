import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const password = 'GriffithAdmin!'
    const hash = await bcrypt.hash(password, 12)

    await sql`
      INSERT INTO admins (email, password_hash)
      VALUES ('scott@griffithsales.com', ${hash})
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `
    await sql`
      INSERT INTO admins (email, password_hash)
      VALUES ('richard@griffithsales.com', ${hash})
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `

    return NextResponse.json({ success: true, added: ['scott@griffithsales.com', 'richard@griffithsales.com'] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
