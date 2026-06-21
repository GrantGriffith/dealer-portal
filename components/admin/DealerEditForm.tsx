'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Manufacturer {
  id: number
  name: string
  category: string
}

interface Tier {
  id: number
  manufacturer_id: number
  tier_name: string
  sort_order: number
}

interface Dealer {
  id: number
  first_name: string
  last_name: string
  email: string
  company: string
  is_active: boolean
}

interface Props {
  dealer: Dealer | null
  allManufacturers: Manufacturer[]
  authorizedIds: number[]
  tierAssignments: Record<number, number>   // manufacturerId → tierId
  tiersMap: Record<number, Tier[]>          // manufacturerId → tiers[]
  isNew: boolean
}

export default function DealerEditForm({
  dealer, allManufacturers, authorizedIds, tierAssignments, tiersMap, isNew,
}: Props) {
  const router = useRouter()
  const [firstName, setFirstName] = useState(dealer?.first_name ?? '')
  const [lastName, setLastName] = useState(dealer?.last_name ?? '')
  const [email, setEmail] = useState(dealer?.email ?? '')
  const [company, setCompany] = useState(dealer?.company ?? '')
  const [isActive, setIsActive] = useState(dealer?.is_active ?? false)
  const [password, setPassword] = useState('')
  const [selectedMfrs, setSelectedMfrs] = useState<Set<number>>(new Set(authorizedIds))
  // manufacturerId → tierId (null = no tier / no selection)
  const [selectedTiers, setSelectedTiers] = useState<Record<number, number | null>>(
    () => {
      const init: Record<number, number | null> = {}
      for (const [mfrId, tierId] of Object.entries(tierAssignments)) {
        init[Number(mfrId)] = tierId
      }
      return init
    }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Group manufacturers by category
  const grouped: Record<string, Manufacturer[]> = {}
  for (const m of allManufacturers) {
    const cat = m.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(m)
  }
  const categories = Object.keys(grouped).sort()

  function toggleMfr(id: number) {
    setSelectedMfrs(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // Clear tier when unchecking
        setSelectedTiers(t => { const n = { ...t }; delete n[id]; return n })
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleCategory(cat: string) {
    const catIds = grouped[cat].map(m => m.id)
    const allSelected = catIds.every(id => selectedMfrs.has(id))
    setSelectedMfrs(prev => {
      const next = new Set(prev)
      if (allSelected) {
        catIds.forEach(id => {
          next.delete(id)
          setSelectedTiers(t => { const n = { ...t }; delete n[id]; return n })
        })
      } else {
        catIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function setTier(mfrId: number, tierId: number | null) {
    setSelectedTiers(prev => ({ ...prev, [mfrId]: tierId }))
  }

  async function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)

    // Build assignments array
    const manufacturerAssignments = Array.from(selectedMfrs).map(mfrId => ({
      manufacturerId: mfrId,
      tierId: selectedTiers[mfrId] ?? null,
    }))

    try {
      if (isNew) {
        if (!password) { setError('Password is required for new dealers.'); setSaving(false); return }
        const res = await fetch('/api/admin/dealers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, company, password, isActive }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Failed to create dealer.'); setSaving(false); return }

        if (manufacturerAssignments.length > 0) {
          await fetch(`/api/admin/dealers/${data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manufacturerAssignments }),
          })
        }

        setSuccess('Dealer created!')
        router.push(`/admin/dealers/${data.id}`)
      } else {
        const body: Record<string, unknown> = {
          firstName, lastName, company, isActive, manufacturerAssignments,
        }
        if (password) body.password = password

        const res = await fetch(`/api/admin/dealers/${dealer!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Failed to save.'); setSaving(false); return }
        setSuccess('Saved!')
      }
    } catch {
      setError('Network error. Please try again.')
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!dealer || !confirm(`Delete ${dealer.first_name} ${dealer.last_name}? This cannot be undone.`)) return
    await fetch(`/api/admin/dealers/${dealer.id}`, { method: 'DELETE' })
    router.push('/admin/dealers')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Dealer info */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Dealer Information</h2>
          <div className="space-y-3">
            {[
              { label: 'First Name', val: firstName, set: setFirstName },
              { label: 'Last Name',  val: lastName,  set: setLastName  },
              { label: 'Company',    val: company,   set: setCompany   },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input
                  type="text" value={val} onChange={e => set(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!isNew}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044] disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {isNew ? 'Password' : 'New Password (leave blank to keep current)'}
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={isNew ? 'Required' : '••••••••'}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input
                id="active" type="checkbox" checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-[#0f2044]"
              />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">
                Account Active (can log in)
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}
          <button
            onClick={handleSave} disabled={saving}
            className="w-full bg-[#0f2044] hover:bg-[#1a3a6b] text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : isNew ? 'Create Dealer' : 'Save Changes'}
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm transition"
            >
              Delete Dealer
            </button>
          )}
          <button onClick={() => router.push('/admin/dealers')}
            className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-lg text-sm transition">
            ← Back to Dealers
          </button>
        </div>
      </div>

      {/* Manufacturer access */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">
              Manufacturer Access
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({selectedMfrs.size} selected)
              </span>
            </h2>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setSelectedMfrs(new Set(allManufacturers.map(m => m.id)))}
                className="text-[#0f2044] hover:underline"
              >Select All</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => { setSelectedMfrs(new Set()); setSelectedTiers({}) }} className="text-slate-500 hover:underline">
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {categories.map(cat => {
              const mfrs = grouped[cat]
              const allCatSelected = mfrs.every(m => selectedMfrs.has(m.id))
              const someCatSelected = mfrs.some(m => selectedMfrs.has(m.id))

              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 hover:text-slate-600 transition"
                  >
                    <span className={`inline-block w-3.5 h-3.5 rounded border flex-shrink-0 ${
                      allCatSelected ? 'bg-[#0f2044] border-[#0f2044]'
                      : someCatSelected ? 'bg-blue-200 border-[#0f2044]'
                      : 'border-slate-300'
                    }`} />
                    {cat}
                  </button>
                  <div className="space-y-2">
                    {mfrs.map(m => {
                      const tiers = tiersMap[m.id] ?? []
                      const hasTiers = tiers.length > 0
                      const isChecked = selectedMfrs.has(m.id)

                      return (
                        <div key={m.id} className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer group min-w-[160px]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleMfr(m.id)}
                              className="h-4 w-4 accent-[#0f2044] flex-shrink-0"
                            />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-tight">
                              {m.name}
                            </span>
                          </label>
                          {hasTiers && isChecked && (
                            <select
                              value={selectedTiers[m.id] ?? ''}
                              onChange={e => setTier(m.id, e.target.value ? Number(e.target.value) : null)}
                              className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0f2044] text-slate-700 bg-slate-50"
                            >
                              <option value="">— select tier —</option>
                              {tiers
                                .sort((a, b) => a.sort_order - b.sort_order)
                                .map(t => (
                                  <option key={t.id} value={t.id}>{t.tier_name}</option>
                                ))}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
