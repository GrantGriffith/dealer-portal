import { sql } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [dealers, active, mfr] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM dealers`,
    sql`SELECT COUNT(*)::int AS count FROM dealers WHERE is_active = true`,
    sql`SELECT COUNT(*)::int AS count FROM manufacturers`,
  ])
  return {
    totalDealers:  (dealers[0] as { count: number }).count,
    activeDealers: (active[0]  as { count: number }).count,
    manufacturers: (mfr[0]    as { count: number }).count,
  }
}

async function getRecentDealers() {
  const rows = await sql`
    SELECT id, first_name, last_name, company, email, is_active, created_at
    FROM dealers ORDER BY created_at DESC LIMIT 10
  `
  return rows as unknown as {
    id: number; first_name: string; last_name: string;
    company: string; email: string; is_active: boolean; created_at: string
  }[]
}

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([getStats(), getRecentDealers()])

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Dealers"   value={stats.totalDealers}  />
        <StatCard label="Active Dealers"  value={stats.activeDealers} color="green" />
        <StatCard label="Manufacturers"   value={stats.manufacturers} />
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
        <Link href="/admin/dealers/new"
          className="bg-[#0f2044] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a3a6b] transition">
          + Add Dealer
        </Link>
        <Link href="/admin/dealers"
          className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
          Manage Dealers
        </Link>
        <Link href="/admin/manufacturers"
          className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
          Manage Manufacturers
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Recently Added</h2>
          <Link href="/admin/dealers" className="text-xs text-[#0f2044] hover:underline">View all →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Company</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium">{d.first_name} {d.last_name}</td>
                <td className="px-5 py-3 text-slate-600">{d.company}</td>
                <td className="px-5 py-3 text-slate-500">{d.email}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    d.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/dealers/${d.id}`} className="text-[#0f2044] hover:underline text-xs">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'navy' }: { label: string; value: number; color?: string }) {
  const textColor = color === 'green' ? 'text-green-600' : 'text-[#0f2044]'
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-5">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className={`text-4xl font-bold ${textColor}`}>{value}</p>
    </div>
  )
}
