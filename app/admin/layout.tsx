import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import Link from 'next/link'
import { adminSessionOptions, AdminSessionData } from '@/lib/session'
import GriffithLogo from '@/components/GriffithLogo'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<AdminSessionData>(cookies(), adminSessionOptions)

  // Login page doesn't need the nav shell
  // We only render the shell for authenticated admin pages
  if (!session.adminId) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top nav */}
      <header className="bg-[#0f2044] text-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GriffithLogo size={36} color="white" />
            <div>
              <span className="font-semibold">Admin Panel</span>
              <span className="text-blue-300 text-xs ml-2">Griffith Sales Associates</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin/dashboard" className="hover:text-blue-300 transition">Dashboard</Link>
            <Link href="/admin/dealers"   className="hover:text-blue-300 transition">Dealers</Link>
            <Link href="/admin/manufacturers" className="hover:text-blue-300 transition">Manufacturers</Link>
            <form action="/api/auth/admin-logout" method="POST" className="ml-2">
              <button className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
