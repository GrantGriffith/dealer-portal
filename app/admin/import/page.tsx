'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ParsedDealer {
  firstName: string
  lastName: string
  email: string
  company: string
}

function parseCSV(text: string): { dealers: ParsedDealer[]; errors: string[] } {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const dealers: ParsedDealer[] = []
  const errors: string[] = []

  if (lines.length === 0) return { dealers, errors }

  // Detect separator from first line
  const sep = lines[0].includes('\t') ? '\t' : ','
  const clean = (s: string) => s.trim().replace(/^["']|["']$/g, '').trim()

  // Check if first row is a header
  const firstCols = lines[0].split(sep).map(c => c.toLowerCase().trim().replace(/^["']|["']$/g, ''))
  const hasHeader = firstCols.some(c =>
    c.includes('email') || c.includes('first') || c.includes('last') ||
    c.includes('name') || c.includes('org') || c.includes('company')
  )

  // Build column index map from header
  let colMap: Record<string, number> = {}
  if (hasHeader) {
    firstCols.forEach((col, i) => {
      if (col.includes('email'))                          colMap.email = i
      else if (col.includes('first'))                     colMap.firstName = i
      else if (col.includes('last'))                      colMap.lastName = i
      else if (col.includes('org') || col.includes('company') || col.includes('account')) colMap.company = i
    })
  }

  const dataLines = hasHeader ? lines.slice(1) : lines

  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(sep).map(clean)
    if (cols.length < 2 || cols.every(c => !c)) continue

    let firstName = '', lastName = '', email = '', company = ''

    if (hasHeader && Object.keys(colMap).length > 0) {
      // Use header-based mapping
      email     = colMap.email     !== undefined ? cols[colMap.email]     ?? '' : ''
      firstName = colMap.firstName !== undefined ? cols[colMap.firstName] ?? '' : ''
      lastName  = colMap.lastName  !== undefined ? cols[colMap.lastName]  ?? '' : ''
      company   = colMap.company   !== undefined ? cols[colMap.company]   ?? '' : ''
    } else {
      // Fallback: find email by @ sign, rest by position
      const emailIdx = cols.findIndex(c => c.includes('@'))
      if (emailIdx === -1) {
        errors.push(`Row ${i + 1}: could not find email address`)
        continue
      }
      email = cols[emailIdx]
      const rest = cols.filter((_, idx) => idx !== emailIdx)
      firstName = rest[0] || ''
      lastName  = rest[1] || ''
      company   = rest[2] || ''
    }

    if (!email.includes('@')) {
      errors.push(`Row ${i + 1}: invalid email "${email}"`)
      continue
    }

    dealers.push({ firstName, lastName, email: email.toLowerCase(), company })
  }

  return { dealers, errors }
}

export default function ImportPage() {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [assignedTo, setAssignedTo] = useState('Grant')
  const [password, setPassword] = useState('')
  const [preview, setPreview] = useState<ParsedDealer[] | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  function handleParse() {
    const { dealers, errors } = parseCSV(csvText)
    setPreview(dealers)
    setParseErrors(errors)
    setResult(null)
    setError('')
  }

  async function handleImport() {
    if (!preview?.length || !password) return
    setImporting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/import-dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealers: preview,
          defaultPassword: password,
          assignedTo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Import failed'); setImporting(false); return }
      setResult(data)
      setPreview(null)
      setCsvText('')
    } catch {
      setError('Network error.')
    }
    setImporting(false)
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Import Dealers</h1>
      <p className="text-slate-500 text-sm mb-6">
        Paste CSV data below. Any column order works as long as you include a header row. Recognized headers: <code className="bg-slate-100 px-1 rounded text-xs">Organization</code>, <code className="bg-slate-100 px-1 rounded text-xs">First Name</code>, <code className="bg-slate-100 px-1 rounded text-xs">Last Name</code>, <code className="bg-slate-100 px-1 rounded text-xs">Email</code>.
      </p>

      <div className="space-y-5">
        {/* CSV input */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <label className="block text-xs font-medium text-slate-600 mb-2">Paste CSV data</label>
          <textarea
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setPreview(null); setResult(null) }}
            placeholder={`Organization,First Name,Last Name,email\nCamcor,Ted,Smith,ted@camcor.com\nCamcor,Jane,Doe,jane@camcor.com`}
            rows={8}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0f2044] resize-y"
          />
          <button
            onClick={handleParse}
            disabled={!csvText.trim()}
            className="mt-3 bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            Preview Import
          </button>
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">Warnings ({parseErrors.length} rows skipped)</p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">{preview.length} dealers ready to import</p>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Company</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((d, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{d.firstName} {d.lastName}</td>
                      <td className="px-4 py-2 text-slate-500">{d.email}</td>
                      <td className="px-4 py-2 text-slate-500">{d.company || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import settings */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Rep</label>
                  <select
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044] bg-white"
                  >
                    <option>Grant</option>
                    <option>Richard</option>
                    <option>Scott</option>
                  </select>
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Default Password</label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="e.g. Griffith2024!"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044]"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                onClick={handleImport}
                disabled={importing || !password}
                className="bg-[#0f2044] hover:bg-[#1a3a6b] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-60"
              >
                {importing ? 'Importing…' : `Import ${preview.length} Dealers → ${assignedTo}`}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="font-semibold text-green-700">Import complete</p>
            <p className="text-sm text-green-600 mt-1">
              {result.created} created, {result.skipped} skipped (already exist or missing data)
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => router.push('/admin/dealers')}
                className="bg-[#0f2044] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1a3a6b] transition"
              >
                View Dealers →
              </button>
              <button
                onClick={() => setResult(null)}
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition"
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
