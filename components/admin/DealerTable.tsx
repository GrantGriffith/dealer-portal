'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const ADMINS = ['Grant', 'Richard', 'Scott'] as const
type AdminName = typeof ADMINS[number]

interface Dealer {
  id: number
  first_name: string
  last_name: string
  email: string
  company: string
  is_active: boolean
  assigned_to: string | null
  manufacturer_count: number
  created_at: string
}

export default function DealerTable({ dealers }: { dealers: Dealer[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [adminFilter, setAdminFilter] = useState<'all' | AdminName>('all')
  const [activating, setActivating] = useState(false)
  const [message, setMessage] = useState('')

  const filtered = dealers.filter(d => {
    const matchSearch =
      `${d.first_name} ${d.last_name} ${d.email} ${d.company}`
        .toLowerCase()
        .includes(search.toLowerCase())
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && d.is_active) ||
      (statusFilter === 'inactive' && !d.is_active)
    const matchAdmin =
      adminFilter === 'all' || (d.assigned_to ?? 'Grant') === adminFilter
    return matchSearch && matchStatus && matchAdmin
  })

  const inactiveFiltered = filtered.filter(d => !d.is_active)

  async function activateFiltered() {
    if (inactiveFiltered.length === 0) return
    setActivating(true)
    setMessage('')

    const activateAll = search === '' && statusFilter !== 'active' && adminFilter === 'all'
      && inactiveFiltered.length === dealers.filter(d => !d.is_active).length

    const body = activateAll
      ? { all: true }
      : { ids: inactiveFiltered.map(d => d.id) }

    const res = await fetch('/api/admin/dealers/bulk-activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setActivating(false)
    if (data.activated !== undefined) {
      setMessage(`✓ ${data.activated} dealers activated`)
      router.refresh()
    } else {
      setMessage('Error activating dealers')
    }
  }

  // Per-admin counts
  const counts: Record<string, number> = { all: dealers.length }
  for (const a of ADMINS) {
    counts[a] = dealers.filter(d => (d.assigned_to ?? 'Grant') === a).length
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3">
        {/* Admin tabs */}
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setAdminFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              adminFilter === 'all'
                ? 'bg-[#0f2044] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All <span className="ml-1 text-xs opacity-70">({counts.all})</span>
          </button>
          {ADMINS.map(a => (
            <button
              key={a}
              onClick={() => setAdminFilter(a)}
              className={`px-3 py-1.5 rounded-lg transition ${
                adminFilter === a
                  ? 'bg-[#0f2044] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {a} <span className="ml-1 text-xs opacity-70">({counts[a]})</span>
            </button>
          ))}
        </div>

        {/* Search + status filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Search by name, email, or company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
          />
          <div className="flex gap-2 text-sm">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg capitalize transition ${
                  statusFilter === f
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {inactiveFiltered.length > 0 && (
            <button
              onClick={activateFiltered}
              disabled={activating}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-60 whitespace-nowrap"
            >
              {activating ? 'Activating…' : `Activate ${inactiveFiltered.length} Inactive`}
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-400">{filtered.length} of {dealers.length} dealers</p>
        {message && <p className="text-xs text-green-600 font-medium">{message}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Company</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Rep</th>
              <th className="px-5 py-3 text-left">Mfrs</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium whitespace-nowrap">
                  {d.first_name} {d.last_name}
                </td>
                <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{d.company || '—'}</td>
                <td className="px-5 py-3 text-slate-500">{d.email}</td>
                <td className="px-5 py-3">
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    {d.assigned_to ?? 'Grant'}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {d.manufacturer_count}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    d.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/dealers/${d.id}`}
                    className="text-[#0f2044] hover:underline text-xs font-medium"
                  >
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  No dealers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
