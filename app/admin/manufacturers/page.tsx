import { getAllManufacturers } from '@/lib/db'
import ManufacturerManager from '@/components/admin/ManufacturerManager'

export const dynamic = 'force-dynamic'

export default async function ManufacturersPage() {
  const manufacturers = await getAllManufacturers()

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Manufacturers</h1>
      <ManufacturerManager manufacturers={manufacturers} />
    </div>
  )
}
