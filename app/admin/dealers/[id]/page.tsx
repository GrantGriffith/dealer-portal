import { getDealerById, getDealerManufacturerIds, getDealerTierAssignments, getAllManufacturers, getTiersForManufacturers } from '@/lib/db'
import { notFound } from 'next/navigation'
import DealerEditForm from '@/components/admin/DealerEditForm'

export const dynamic = 'force-dynamic'

export default async function EditDealerPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'
  const id = isNew ? null : parseInt(params.id)

  const [dealer, authorizedIds, tierAssignments, allMfrs] = await Promise.all([
    id ? getDealerById(id) : null,
    id ? getDealerManufacturerIds(id) : [],
    id ? getDealerTierAssignments(id) : {},
    getAllManufacturers(),
  ])

  if (!isNew && !dealer) notFound()

  // Get tiers for all manufacturers that have them
  const allMfrIds = allMfrs.map(m => m.id)
  const tiersMap = await getTiersForManufacturers(allMfrIds)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isNew ? 'Add Dealer' : `Edit: ${dealer?.first_name} ${dealer?.last_name}`}
      </h1>
      <DealerEditForm
        dealer={dealer ?? null}
        allManufacturers={allMfrs}
        authorizedIds={authorizedIds}
        tierAssignments={tierAssignments}
        tiersMap={tiersMap}
        isNew={isNew}
      />
    </div>
  )
}
