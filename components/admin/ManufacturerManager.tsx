'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function toDateStr(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).slice(0, 10)
}

function formatEffectiveDate(val: unknown): string | null {
  const dateStr = toDateStr(val)
  if (!dateStr) return null
  const [year, month] = dateStr.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface Manufacturer {
  id: number
  name: string
  category: string
  logo_url: string | null
  price_list_url: string | null
  price_list_effective_date: string | null
}

interface Tier {
  id: number
  manufacturer_id: number
  tier_name: string
  price_list_url: string | null
  price_list_effective_date: string | null
  sort_order: number
}

// ── Tier panel (lazy-loaded when opened) ──────────────────────────────────────
function TierPanel({ mfr }: { mfr: Manufacturer }) {
  const [tiers, setTiers] = useState<Tier[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [newTierName, setNewTierName] = useState('')
  const [addingTier, setAddingTier] = useState(false)
  const [uploadingTierId, setUploadingTierId] = useState<number | null>(null)
  const tierInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/manufacturers/${mfr.id}/tiers`)
      .then(r => r.json())
      .then(data => { setTiers(data); setLoading(false) })
      .catch(() => { setTiers([]); setLoading(false) })
  }, [mfr.id])

  async function addTier() {
    if (!newTierName.trim()) return
    setAddingTier(true)
    const res = await fetch(`/api/admin/manufacturers/${mfr.id}/tiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tierName: newTierName.trim(), sortOrder: (tiers?.length ?? 0) }),
    })
    const newTier = await res.json()
    setTiers(prev => [...(prev ?? []), newTier])
    setNewTierName('')
    setAddingTier(false)
  }

  async function deleteTier(tierId: number) {
    if (!confirm('Delete this tier? Dealers assigned to it will lose access to this tier\'s price list.')) return
    await fetch(`/api/admin/manufacturers/${mfr.id}/tiers`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tierId }),
    })
    setTiers(prev => (prev ?? []).filter(t => t.id !== tierId))
  }

  const [editingDateTierId, setEditingDateTierId] = useState<number | null>(null)
  const [dateOverride, setDateOverride] = useState('')

  async function uploadTierPriceList(tier: Tier, file: File) {
    setUploadingTierId(tier.id)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'pricelist')
      fd.append('manufacturerId', String(mfr.id))
      fd.append('tierId', String(tier.id))
      const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(data.details || data.error || 'Upload failed')

      // Auto-date to current month
      const effectiveDate = currentMonthValue() + '-01'
      const patchRes = await fetch(`/api/admin/manufacturers/${mfr.id}/tiers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: tier.id, priceListUrl: data.url, priceListEffectiveDate: effectiveDate }),
      })
      const updated = await patchRes.json()
      setTiers(prev => (prev ?? []).map(t => t.id === updated.id ? updated : t))
    } catch (err) {
      alert('Upload failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setUploadingTierId(null)
  }

  async function saveDateOverride(tierId: number) {
    if (!dateOverride) return
    const effectiveDate = dateOverride + '-01'
    const res = await fetch(`/api/admin/manufacturers/${mfr.id}/tiers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tierId, priceListEffectiveDate: effectiveDate }),
    })
    const updated = await res.json()
    setTiers(prev => (prev ?? []).map(t => t.id === updated.id ? updated : t))
    setEditingDateTierId(null)
  }

  if (loading) return <p className="text-xs text-slate-400 py-2 px-3">Loading tiers…</p>

  const sorted = [...(tiers ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="bg-slate-50 border-t border-slate-100 px-5 py-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Pricing Tiers</p>

      {sorted.length === 0 && (
        <p className="text-xs text-slate-400">No tiers yet. Add one below.</p>
      )}

      {sorted.map(tier => (
        <div key={tier.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-700 flex-1 min-w-[120px]">{tier.tier_name}</span>

            {/* Hidden file input per tier */}
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              ref={el => { tierInputRefs.current[tier.id] = el }}
              onChange={e => {
                if (e.target.files?.[0]) uploadTierPriceList(tier, e.target.files[0])
                e.target.value = ''
              }}
            />
            <button
              onClick={() => tierInputRefs.current[tier.id]?.click()}
              disabled={uploadingTierId === tier.id}
              className={`text-xs border px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                tier.price_list_url
                  ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {uploadingTierId === tier.id
                ? 'Uploading…'
                : tier.price_list_url ? '✓ Price List' : '📄 Upload Price List'}
            </button>

            <button onClick={() => deleteTier(tier.id)} className="text-xs text-red-500 hover:underline">
              Remove
            </button>
          </div>

          {/* Effective date */}
          {tier.price_list_url && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-0.5">
              {editingDateTierId === tier.id ? (
                <>
                  <input
                    type="month"
                    defaultValue={toDateStr(tier.price_list_effective_date) ?? currentMonthValue()}
                    onChange={e => setDateOverride(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f2044]"
                  />
                  <button onClick={() => saveDateOverride(tier.id)} className="text-[#0f2044] hover:underline">Save</button>
                  <button onClick={() => setEditingDateTierId(null)} className="text-slate-400 hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <span>{tier.price_list_effective_date ? `Effective ${formatEffectiveDate(tier.price_list_effective_date)}` : 'No date set'}</span>
                  <button
                    onClick={() => { setEditingDateTierId(tier.id); setDateOverride(toDateStr(tier.price_list_effective_date) ?? currentMonthValue()) }}
                    className="text-slate-400 hover:text-[#0f2044] underline"
                  >
                    change
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add tier */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="New tier name (e.g. Gold)"
          value={newTierName}
          onChange={e => setNewTierName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTier()}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
        />
        <button
          onClick={addTier}
          disabled={addingTier || !newTierName.trim()}
          className="bg-[#0f2044] text-white px-4 py-1.5 rounded-lg text-sm hover:bg-[#1a3a6b] transition disabled:opacity-50"
        >
          {addingTier ? '…' : '+ Add Tier'}
        </button>
      </div>
    </div>
  )
}

// ── MfrRow ────────────────────────────────────────────────────────────────────
function MfrRow({
  m,
  onEditing,
  onDelete,
  onUpdated,
}: {
  m: Manufacturer
  onEditing: (mfr: Manufacturer) => void
  onDelete: (id: number) => void
  onUpdated: (mfr: Manufacturer) => void
}) {
  const [uploading, setUploading] = useState<'logo' | 'pricelist' | null>(null)
  const [showTiers, setShowTiers] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [dateOverride, setDateOverride] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const plInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(type: 'logo' | 'pricelist', file: File) {
    setUploading(type)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      fd.append('manufacturerId', String(m.id))
      const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(data.details || data.error || 'Upload failed')

      const patch: Record<string, string> = type === 'logo'
        ? { logoUrl: data.url }
        : { priceListUrl: data.url, priceListEffectiveDate: currentMonthValue() + '-01' }

      const patchRes = await fetch(`/api/admin/manufacturers/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const updated = await patchRes.json()
      onUpdated(updated)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setUploading(null)
  }

  async function saveDateOverride() {
    if (!dateOverride) return
    const res = await fetch(`/api/admin/manufacturers/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceListEffectiveDate: dateOverride + '-01' }),
    })
    const updated = await res.json()
    onUpdated(updated)
    setEditingDate(false)
  }

  return (
    <div className="divide-y divide-slate-50">
      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
        {/* Logo preview */}
        <div className="w-16 h-12 flex-shrink-0 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
          {m.logo_url ? (
            <Image src={m.logo_url} alt={m.name} width={64} height={48} className="object-contain" unoptimized />
          ) : (
            <span className="text-xs text-slate-400 text-center px-1 leading-tight">{m.name}</span>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm">{m.name}</p>
          <p className="text-xs text-slate-400">{m.category}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">

          {/* Logo upload */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleUpload('logo', e.target.files[0]); e.target.value='' }}
          />
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={!!uploading}
            className="text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {uploading === 'logo' ? 'Uploading…' : m.logo_url ? '✓ Logo' : '📷 Logo'}
          </button>

          {/* Price list upload (fallback / non-tiered) */}
          <input
            ref={plInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleUpload('pricelist', e.target.files[0]); e.target.value='' }}
          />
          <button
            onClick={() => plInputRef.current?.click()}
            disabled={!!uploading}
            className={`text-xs border px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
              m.price_list_url
                ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {uploading === 'pricelist' ? 'Uploading…' : m.price_list_url ? '✓ Price List' : '📄 Price List'}
          </button>

          {/* Effective date (for non-tiered price lists) */}
          {m.price_list_url && !showTiers && (
            editingDate ? (
              <div className="flex items-center gap-1">
                <input
                  type="month"
                  defaultValue={toDateStr(m.price_list_effective_date) ?? currentMonthValue()}
                  onChange={e => setDateOverride(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0f2044]"
                />
                <button onClick={saveDateOverride} className="text-xs text-[#0f2044] hover:underline">Save</button>
                <button onClick={() => setEditingDate(false)} className="text-xs text-slate-400 hover:underline">✕</button>
              </div>
            ) : (
              <span className="text-xs text-slate-400">
                {m.price_list_effective_date ? formatEffectiveDate(m.price_list_effective_date) : 'No date'}
                {' · '}
                <button onClick={() => { setEditingDate(true); setDateOverride(toDateStr(m.price_list_effective_date) ?? currentMonthValue()) }} className="hover:text-[#0f2044] underline">
                  change
                </button>
              </span>
            )
          )}

          {/* Tiers toggle */}
          <button
            onClick={() => setShowTiers(v => !v)}
            className={`text-xs border px-3 py-1.5 rounded-lg transition ${
              showTiers
                ? 'bg-[#0f2044] text-white border-[#0f2044]'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tiers
          </button>

          <button onClick={() => onEditing(m)} className="text-xs text-[#0f2044] hover:underline px-1">
            Edit
          </button>
          <button onClick={() => onDelete(m.id)} className="text-xs text-red-500 hover:underline px-1">
            Delete
          </button>
        </div>
      </div>

      {showTiers && <TierPanel mfr={m} />}
    </div>
  )
}

// ── ManufacturerManager ───────────────────────────────────────────────────────
export default function ManufacturerManager({ manufacturers: initial }: { manufacturers: Manufacturer[] }) {
  const [mfrs, setMfrs] = useState<Manufacturer[]>(initial)
  const [editing, setEditing] = useState<Manufacturer | null>(null)
  const [editName, setEditName] = useState('')
  const [editCat, setEditCat] = useState('')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(m: Manufacturer) {
    setEditing(m)
    setEditName(m.name)
    setEditCat(m.category)
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/admin/manufacturers/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, category: editCat }),
    })
    const updated = await res.json()
    setMfrs(prev => prev.map(m => m.id === updated.id ? updated : m))
    setEditing(null)
    setSaving(false)
  }

  async function addManufacturer() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/manufacturers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), category: newCategory.trim() }),
    })
    const m = await res.json()
    setMfrs(prev => [...prev, m].sort((a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    ))
    setNewName('')
    setNewCategory('')
    setSaving(false)
  }

  async function deleteMfr(id: number) {
    if (!confirm('Delete this manufacturer? All dealer access for it will be removed.')) return
    await fetch(`/api/admin/manufacturers/${id}`, { method: 'DELETE' })
    setMfrs(prev => prev.filter(m => m.id !== id))
  }

  function onUpdated(updated: Manufacturer) {
    setMfrs(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  // Group by category
  const grouped: Record<string, Manufacturer[]> = {}
  for (const m of mfrs) {
    const cat = m.category || 'Uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(m)
  }

  return (
    <div className="space-y-6">
      {/* Add new */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-4">Add Manufacturer</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text" placeholder="Name (e.g. Powersoft)"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addManufacturer()}
            className="flex-1 min-w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
          />
          <select
            value={newCategory} onChange={e => setNewCategory(e.target.value)}
            className="flex-1 min-w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044] bg-white"
          >
            <option value="">— Select category —</option>
            {Object.keys(grouped).sort().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={addManufacturer} disabled={saving || !newName.trim() || !newCategory}
            className="bg-[#0f2044] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#1a3a6b] transition disabled:opacity-50"
          >
            {saving ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-700 mb-3">Edit: {editing.name}</h3>
          <div className="flex gap-3 flex-wrap">
            <input
              value={editName} onChange={e => setEditName(e.target.value)}
              placeholder="Name"
              className="flex-1 min-w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
            />
            <select
              value={editCat} onChange={e => setEditCat(e.target.value)}
              className="flex-1 min-w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044] bg-white"
            >
              <option value="">— Select category —</option>
              {Object.keys(grouped).sort().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button onClick={saveEdit} disabled={saving}
              className="bg-[#0f2044] text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditing(null)}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grouped list */}
      {Object.keys(grouped).sort().map(cat => (
        <div key={cat} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{cat}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {grouped[cat].map(m => (
              <MfrRow
                key={m.id}
                m={m}
                onEditing={startEdit}
                onDelete={deleteMfr}
                onUpdated={onUpdated}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
