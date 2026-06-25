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

  // Detect if first line is a header
  const first = lines[0].toLowerCase()
  const hasHeader = first.includes('email') || first.includes('first') || first.includes('name')
  const dataLines = hasHeader ? lines.slice(1) : lines

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]
    // Support comma or tab delimited
    const sep = line.includes('\t') ? '\t' : ','
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))

    if (cols.length < 2) {
      errors.push(`Row ${i + 1}: not enough columns (need at least firstName, email)`)
      continue
    }

    // Try to detect column order: firstName, lastName, email, company
    // OR: email, firstName, lastName, company
    let firstName = '', lastName = '', email = '', company = ''

    if (cols[0].includes('@')) {
      // email first
      email = cols[0]
      firstName = cols[1] || ''
      lastName = cols[2] || ''
      company = cols[3] || ''
    } else {
      firstName = cols[0]
      lastName = cols[1] || ''
      // Check if col[2] is email or col[1]
      if (cols[2]?.includes('@')) {
        email = cols[2]
        company = cols[3] || ''
      } else if (cols[1]?.includes('@')) {
        email = cols[1]
        lastName = ''
        company = cols[2] || ''
      } else {
        errors.push(`Row ${i + 1}: could not find email address`)
        continue
      }
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
        Paste CSV data below. Columns: <code className="bg-slate-100 px-1 rounded text-xs">firstName, lastName, email, company</code> (header row optional).
      </p>

      <div className="space-y-5">
        {/* CSV input */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <label className="block text-xs font-medium text-slate-600 mb-2">Paste CSV data</label>
          <textarea
            value={csvText}
            onChange={e => { setCsvText(e.target.value); setPreview(null); setResult(null) }}
            placeholder={`firstName,lastName,email,company\nJane,Smith,jane@acme.com,Acme Audio\nBob,Jones,bob@demo.com,Demo AV`}
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
