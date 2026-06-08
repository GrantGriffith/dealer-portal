import { getAllDealers } from '@/lib/db'
import Link from 'next/link'
import DealerTable from '@/components/admin/DealerTable'

export const dynamic = 'force-dynamic'

export default async function DealersPage() {
  const dealers = await getAllDealers()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dealers</h1>
        <div className="flex gap-3">
          <Link href="/admin/dealers/import" className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition">
            Import CSV
          </Link>
          <Link href="/admin/dealers/new" className="bg-[#0f2044] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#1a3a6b] transition">
            + Add Dealer
          </Link>
        </div>
      </div>

      <DealerTable dealers={dealers} />
    </div>
  )
}
