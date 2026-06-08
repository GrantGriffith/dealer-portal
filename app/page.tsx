'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import GriffithLogo from '@/components/GriffithLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid email or password.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 px-4">

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header bar */}
        <div className="bg-[#0f2044] px-8 py-8 flex flex-col items-center gap-3">
          <GriffithLogo size={64} color="white" />
          <div className="text-center text-white">
            <h1 className="text-xl font-semibold tracking-wide">Griffith Sales Associates</h1>
            <p className="text-blue-200 text-sm mt-0.5">Authorized Dealer Portal</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044] focus:border-transparent transition"
              placeholder="you@yourcompany.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2044] focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f2044] hover:bg-[#1a3a6b] text-white font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed text-sm tracking-wide"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-slate-400">
            Need access? Contact{' '}
            <a href="mailto:grant@griffithsales.com" className="text-[#0f2044] hover:underline">
              grant@griffithsales.com
            </a>
          </p>
        </form>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        © {new Date().getFullYear()} Griffith Sales Associates. All rights reserved.
      </p>
    </div>
  )
}
