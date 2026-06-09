'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface Manufacturer {
  id: number
  name: string
  category: string
  logo_url: string | null
  price_list_url: string | null
}

// Each manufacturer row has its own upload buttons with isolated file inputs
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

      const field = type === 'logo' ? 'logoUrl' : 'priceListUrl'
      const patchRes = await fetch(`/api/admin/manufacturers/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: data.url }),
      })
      const updated = await patchRes.json()
      onUpdated(updated)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed: ' + (err instanceof Error ? err.message : String(err)))
    }
    setUploading(null)
  }

  return (
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

        {/* Price list upload */}
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

        <button onClick={() => onEditing(m)} className="text-xs text-[#0f2044] hover:underline px-1">
          Edit
        </button>
        <button onClick={() => onDelete(m.id)} className="text-xs text-red-500 hover:underline px-1">
          Delete
        </button>
      </div>
    </div>
  )
}

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
