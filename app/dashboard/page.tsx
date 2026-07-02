import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { dealerSessionOptions, DealerSessionData } from '@/lib/session'
import { getDealerManufacturers } from '@/lib/db'
import GriffithLogo from '@/components/GriffithLogo'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getIronSession<DealerSessionData>(cookies(), dealerSessionOptions)
  if (!session.dealerId) redirect('/')

  const manufacturers = await getDealerManufacturers(session.dealerId)

  // Group by category
  const grouped: Record<string, typeof manufacturers> = {}
  for (const m of manufacturers) {
    const cat = m.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(m)
  }

  const categories = Object.keys(grouped).sort()

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <header className="bg-[#0f2044] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GriffithLogo size={40} color="white" />
            <div>
              <div className="text-lg font-semibold leading-tight">Griffith Sales Associates</div>
              <div className="text-blue-300 text-xs">Dealer Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{session.firstName} {session.lastName}</div>
              <div className="text-blue-300 text-xs">{session.company}</div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg transition"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">Your Price Lists</h2>
          <p className="text-slate-500 text-sm mt-1">
            Click any manufacturer logo to download the latest price list.
          </p>
        </div>

        {manufacturers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            <p className="text-lg font-medium">No manufacturers assigned yet.</p>
            <p className="text-sm mt-1">
              Contact{' '}
              <a href="mailto:grant@griffithsales.com" className="text-[#0f2044] hover:underline">
                grant@griffithsales.com
              </a>{' '}
              to get access.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map(cat => (
              <section key={cat}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 pl-1">
                  {cat}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {grouped[cat].map(mfr => (
                    <ManufacturerCard key={mfr.id} manufacturer={mfr} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function formatEffectiveDate(val: unknown): string | null {
  if (!val) return null
  const dateStr = val instanceof Date ? val.toISOString().slice(0, 10) : String(val).slice(0, 10)
  const [year, month] = dateStr.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function ManufacturerCard({
  manufacturer,
}: {
  manufacturer: {
    id: number
    name: string
    logo_url: string | null
    price_list_url: string | null
    price_list_effective_date: string | null
    tier_price_list_url: string | null
    tier_price_list_effective_date: string | null
  }
}) {
  // Tier-specific values take priority over manufacturer defaults
  const downloadUrl = manufacturer.tier_price_list_url ?? manufacturer.price_list_url
  const effectiveDate = manufacturer.tier_price_list_effective_date ?? manufacturer.price_list_effective_date

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden group cursor-pointer">
      {/* Logo area */}
      <div className="h-28 flex items-center justify-center bg-white p-4">
        {manufacturer.logo_url ? (
          <Image
            src={manufacturer.logo_url}
            alt={manufacturer.name}
            width={160}
            height={80}
            className="object-contain max-h-20 max-w-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-center text-slate-600 font-semibold text-sm leading-tight px-2">
              {manufacturer.name}
            </span>
          </div>
        )}
      </div>
      {/* Name + download indicator */}
      <div className="bg-slate-50 border-t border-slate-100 px-3 py-2 text-center">
        <p className="text-xs font-medium text-slate-700 truncate">{manufacturer.name}</p>
        {downloadUrl ? (
          <>
            <p className="text-xs text-[#0f2044] mt-0.5 group-hover:underline">↓ Price List</p>
            {effectiveDate && (
              <p className="text-xs text-slate-400 mt-0.5">Effective {formatEffectiveDate(effectiveDate)}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5">No file yet</p>
        )}
      </div>
    </div>
  )

  if (downloadUrl) {
    return (
      <a
        href={`/api/download/${manufacturer.id}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Download ${manufacturer.name} price list`}
      >
        {content}
      </a>
    )
  }

  return <div title="Price list not yet available">{content}</div>
}
