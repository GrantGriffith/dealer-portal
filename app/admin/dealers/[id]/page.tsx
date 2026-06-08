import { getDealerById, getDealerManufacturers, getAllManufacturers } from '@/lib/db'
import { notFound } from 'next/navigation'
import DealerEditForm from '@/components/admin/DealerEditForm'

export const dynamic = 'force-dynamic'

export default async function EditDealerPage({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'
  const id = isNew ? null : parseInt(params.id)

  const [dealer, authorizedMfrs, allMfrs] = await Promise.all([
    id ? getDealerById(id) : null,
    id ? getDealerManufacturers(id) : [],
    getAllManufacturers(),
  ])

  if (!isNew && !dealer) notFound()

  const authorizedIds = authorizedMfrs.map(m => m.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isNew ? 'Add Dealer' : `Edit: ${dealer?.first_name} ${dealer?.last_name}`}
      </h1>
      <DealerEditForm
        dealer={dealer ?? null}
        allManufacturers={allMfrs}
        authorizedIds={authorizedIds}
        isNew={isNew}
      />
    </div>
  )
}
