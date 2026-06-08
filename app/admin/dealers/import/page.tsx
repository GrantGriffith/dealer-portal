'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportDealersPage() {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [defaultPassword, setDefaultPassword] = useState('')
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function parseCSV(text: string): { firstName: string; lastName: string; email: string; company: string }[] {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return []

    const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
    const orgIdx    = header.findIndex(h => h.includes('organization'))
    const fnIdx     = header.findIndex(h => h === 'first name')
    const lnIdx     = header.findIndex(h => h === 'last name')
    const emailIdx  = header.findIndex(h => h.includes('e-mail 1') || h === 'email')

    return lines.slice(1).map(line => {
      // Simple CSV parse (handles quoted fields)
      const cols: string[] = []
      let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
        else cur += ch
      }
      cols.push(cur.trim())

      return {
        firstName: cols[fnIdx]?.replace(/"/g,'') || '',
        lastName:  cols[lnIdx]?.replace(/"/g,'') || '',
        email:     cols[emailIdx]?.replace(/"/g,'') || '',
        company:   cols[orgIdx]?.replace(/"/g,'') || '',
      }
    }).filter(d => d.email && d.firstName)
  }

  async function handleImport() {
    setError('')
    if (!defaultPassword.trim()) { setError('Please set a default password.'); return }
    const dealers = parseCSV(csvText)
    if (dealers.length === 0) { setError('No valid rows found. Check the CSV format.'); return }

    setLoading(true)
    const res = await fetch('/api/admin/import-dealers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealers, defaultPassword }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Import Dealers from CSV</h1>
      <p className="text-slate-500 text-sm mb-6">
        Paste your contacts CSV below. All imported dealers will be inactive by default —
        activate them individually from the dealer list.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Default Password for all imported dealers
          </label>
          <input
            type="text"
            value={defaultPassword}
            onChange={e => setDefaultPassword(e.target.value)}
            placeholder="e.g. GriffithDealer2024!"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
          />
          <p className="text-xs text-slate-400 mt-1">
            Every imported dealer will use this password until you change it individually.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">CSV Data</label>
          <textarea
            rows={12}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder="Paste CSV content here…&#10;Expected columns: Organization Name, First Name, Last Name, E-mail 1 - Value"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            ✓ Import complete — <strong>{result.created}</strong> created, <strong>{result.skipped}</strong> skipped (duplicates or invalid)
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleImport} disabled={loading}
            className="bg-[#0f2044] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a3a6b] transition disabled:opacity-60"
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
          <button
            onClick={() => router.push('/admin/dealers')}
            className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          {result && (
            <button
              onClick={() => router.push('/admin/dealers')}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-green-700 transition"
            >
              View Dealers →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
