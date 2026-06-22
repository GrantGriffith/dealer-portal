import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { redirect } from 'next/navigation'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'
import { sql } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DownloadsPage() {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)
  if (!session.adminId) redirect('/admin/login')

  const rows = await sql`
    SELECT
      dl.id,
      dl.downloaded_at,
      d.first_name, d.last_name, d.email, d.company, d.assigned_to,
      m.name AS manufacturer_name,
      mt.tier_name
    FROM download_logs dl
    JOIN dealers d ON d.id = dl.dealer_id
    JOIN manufacturers m ON m.id = dl.manufacturer_id
    LEFT JOIN manufacturer_tiers mt ON mt.id = dl.tier_id
    ORDER BY dl.downloaded_at DESC
    LIMIT 500
  ` as {
    id: number
    downloaded_at: string
    first_name: string
    last_name: string
    email: string
    company: string
    assigned_to: string | null
    manufacturer_name: string
    tier_name: string | null
  }[]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Download Log</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {rows.length === 500 ? 'Showing latest 500 downloads' : `${rows.length} total downloads`}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400">
            No downloads yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Date / Time</th>
                  <th className="px-5 py-3 text-left">Dealer</th>
                  <th className="px-5 py-3 text-left">Company</th>
                  <th className="px-5 py-3 text-left">Rep</th>
                  <th className="px-5 py-3 text-left">Manufacturer</th>
                  <th className="px-5 py-3 text-left">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(row.downloaded_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago',
                      })} CT
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="font-medium">{row.first_name} {row.last_name}</div>
                      <div className="text-xs text-slate-400">{row.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{row.company || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                        {row.assigned_to ?? 'Grant'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium">{row.manufacturer_name}</td>
                    <td className="px-5 py-3 text-slate-500">{row.tier_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
