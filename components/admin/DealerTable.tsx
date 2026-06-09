'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Dealer {
  id: number
  first_name: string
  last_name: string
  email: string
  company: string
  is_active: boolean
  manufacturer_count: number
  created_at: string
}

export default function DealerTable({ dealers }: { dealers: Dealer[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [activating, setActivating] = useState(false)
  const [message, setMessage] = useState('')

  const filtered = dealers.filter(d => {
    const matchSearch =
      `${d.first_name} ${d.last_name} ${d.email} ${d.company}`
        .toLowerCase()
        .includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && d.is_active) ||
      (filter === 'inactive' && !d.is_active)
    return matchSearch && matchFilter
  })

  const inactiveFiltered = filtered.filter(d => !d.is_active)

  async function activateFiltered() {
    if (inactiveFiltered.length === 0) return
    setActivating(true)
    setMessage('')

    // If activating all dealers (no search, no filter restriction), use the fast all:true path
    const activateAll = search === '' && (filter === 'all' || filter === 'inactive')
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
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
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg capitalize transition ${
                filter === f
                  ? 'bg-[#0f2044] text-white'
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
            {activating ? 'Activating…' : `Activate ${inactiveFiltered.length === dealers.filter(d=>!d.is_active).length && search === '' ? 'All' : inactiveFiltered.length} Inactive`}
          </button>
        )}
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
              <th className="px-5 py-3 text-left">Manufacturers</th>
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
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
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
