import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { dealerSessionOptions, DealerSessionData } from '@/lib/session'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Map assigned rep name → email
const REP_EMAILS: Record<string, string> = {
  Grant:   'Grant@griffithsales.com',
  Richard: 'richard@griffithsales.com',
  Scott:   'scott@griffithsales.com',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { manufacturerId: string } }
) {
  // Require dealer session
  const session = await getIronSession<DealerSessionData>(cookies(), dealerSessionOptions)
  if (!session.dealerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const manufacturerId = parseInt(params.manufacturerId)

  // Look up dealer info + their tier assignment for this manufacturer
  const dealerRows = await sql`
    SELECT d.id, d.first_name, d.last_name, d.email, d.company,
           COALESCE(d.assigned_to, 'Grant') AS assigned_to,
           dm.tier_id,
           mt.price_list_url AS tier_price_list_url,
           m.name AS manufacturer_name,
           m.price_list_url AS default_price_list_url
    FROM dealers d
    JOIN dealer_manufacturers dm ON dm.dealer_id = d.id AND dm.manufacturer_id = ${manufacturerId}
    JOIN manufacturers m ON m.id = ${manufacturerId}
    LEFT JOIN manufacturer_tiers mt ON mt.id = dm.tier_id
    WHERE d.id = ${session.dealerId}
    LIMIT 1
  `

  if (!dealerRows.length) {
    return NextResponse.redirect(new URL('/dashboard', _req.url))
  }

  const row = dealerRows[0] as {
    id: number
    first_name: string
    last_name: string
    email: string
    company: string
    assigned_to: string
    tier_id: number | null
    tier_price_list_url: string | null
    manufacturer_name: string
    default_price_list_url: string | null
  }

  const downloadUrl = row.tier_price_list_url ?? row.default_price_list_url

  if (!downloadUrl) {
    return NextResponse.redirect(new URL('/dashboard', _req.url))
  }

  // Log the download (fire and forget — don't block the redirect)
  sql`
    INSERT INTO download_logs (dealer_id, manufacturer_id, tier_id)
    VALUES (${session.dealerId}, ${manufacturerId}, ${row.tier_id ?? null})
  `.catch(console.error)

  // Send email notification to the assigned rep
  const repEmail = REP_EMAILS[row.assigned_to] ?? REP_EMAILS['Grant']
  const resendKey = process.env.RESEND_API_KEY

  if (resendKey) {
    const subject = `Price list downloaded — ${row.manufacturer_name}`
    const body = `
<p><strong>${row.first_name} ${row.last_name}</strong>${row.company ? ` (${row.company})` : ''} just downloaded the <strong>${row.manufacturer_name}</strong> price list.</p>
<p style="color:#666;font-size:13px;">
  Dealer email: ${row.email}<br/>
  Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT
</p>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
<p style="color:#aaa;font-size:11px;">Griffith Sales Associates — Dealer Portal</p>
    `.trim()

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dealer Portal <portal@griffithsalesconnect.com>',
        to: [repEmail],
        subject,
        html: body,
      }),
    }).catch(console.error) // fire and forget
  }

  // Redirect to the actual file
  return NextResponse.redirect(downloadUrl)
}
