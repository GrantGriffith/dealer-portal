import postgres from 'postgres'

const connectionString =
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  'postgresql://placeholder/placeholder'

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  // Return date/timestamp columns as plain strings instead of Date objects.
  // The postgres library converts DATE/TIMESTAMP columns to JS Date objects by default,
  // which causes RangeError when an invalid date is encountered or when the Date object
  // is later passed to functions expecting a string. Returning as strings matches our
  // TypeScript interfaces (created_at: string, price_list_effective_date: string | null).
  types: {
    date: {
      to: 1082,
      from: [1082, 1114, 1184], // date, timestamp, timestamptz
      serialize: (v: string | Date) => v instanceof Date ? v.toISOString() : String(v),
      parse: (v: string) => v,
    },
  },
})

export { sql }

export interface Dealer {
  id: number
  first_name: string
  last_name: string
  email: string
  company: string
  password_hash: string
  is_active: boolean
  assigned_to: string | null
  created_at: string
}

export interface Manufacturer {
  id: number
  name: string
  category: string
  logo_url: string | null
  price_list_url: string | null
  price_list_effective_date: string | null
}

export interface ManufacturerTier {
  id: number
  manufacturer_id: number
  tier_name: string
  price_list_url: string | null
  price_list_effective_date: string | null
  sort_order: number
}

export interface Admin {
  id: number
  email: string
  password_hash: string
}

function cast<T>(rows: unknown): T { return rows as T }

// ─── Dealers ─────────────────────────────────────────────────────────────────

export async function getDealerByEmail(email: string): Promise<Dealer | null> {
  const rows = await sql`
    SELECT * FROM dealers WHERE LOWER(email) = LOWER(${email}) AND is_active = true LIMIT 1
  `
  return cast<Dealer[]>(rows)[0] ?? null
}

export async function getAllDealers(): Promise<(Dealer & { manufacturer_count: number })[]> {
  const rows = await sql`
    SELECT d.*, COUNT(dm.manufacturer_id)::int AS manufacturer_count
    FROM dealers d
    LEFT JOIN dealer_manufacturers dm ON dm.dealer_id = d.id
    GROUP BY d.id
    ORDER BY d.company, d.last_name, d.first_name
  `
  return cast<(Dealer & { manufacturer_count: number })[]>(rows)
}

export async function getDealerById(id: number): Promise<Dealer | null> {
  const rows = await sql`SELECT * FROM dealers WHERE id = ${id} LIMIT 1`
  return cast<Dealer[]>(rows)[0] ?? null
}

export async function createDealer(
  firstName: string, lastName: string, email: string,
  company: string, passwordHash: string, isActive = false
): Promise<Dealer | null> {
  const rows = await sql`
    INSERT INTO dealers (first_name, last_name, email, company, password_hash, is_active)
    VALUES (${firstName}, ${lastName}, ${email.toLowerCase()}, ${company}, ${passwordHash}, ${isActive})
    ON CONFLICT (email) DO NOTHING
    RETURNING *
  `
  return cast<Dealer[]>(rows)[0] ?? null
}

export async function updateDealer(
  id: number,
  fields: { first_name?: string; last_name?: string; company?: string; is_active?: boolean; password_hash?: string; assigned_to?: string | null }
): Promise<Dealer | null> {
  const current = await getDealerById(id)
  if (!current) return null
  const fn = fields.first_name    ?? current.first_name
  const ln = fields.last_name     ?? current.last_name
  const co = fields.company       ?? current.company
  const ia = fields.is_active     ?? current.is_active
  const ph = fields.password_hash ?? current.password_hash
  const at = 'assigned_to' in fields ? fields.assigned_to : current.assigned_to
  const rows = await sql`
    UPDATE dealers SET first_name=${fn}, last_name=${ln}, company=${co}, is_active=${ia}, password_hash=${ph}, assigned_to=${at ?? null}
    WHERE id=${id} RETURNING *
  `
  return cast<Dealer[]>(rows)[0] ?? null
}

export async function deleteDealer(id: number): Promise<void> {
  await sql`DELETE FROM dealers WHERE id = ${id}`
}

// ─── Manufacturers ────────────────────────────────────────────────────────────

export async function getAllManufacturers(): Promise<Manufacturer[]> {
  const rows = await sql`SELECT * FROM manufacturers ORDER BY category, name`
  return cast<Manufacturer[]>(rows)
}

export async function getManufacturerById(id: number): Promise<Manufacturer | null> {
  const rows = await sql`SELECT * FROM manufacturers WHERE id = ${id} LIMIT 1`
  return cast<Manufacturer[]>(rows)[0] ?? null
}

export async function createManufacturer(
  name: string, category: string, logoUrl?: string, priceListUrl?: string
): Promise<Manufacturer> {
  const rows = await sql`
    INSERT INTO manufacturers (name, category, logo_url, price_list_url)
    VALUES (${name}, ${category}, ${logoUrl ?? null}, ${priceListUrl ?? null})
    RETURNING *
  `
  return cast<Manufacturer[]>(rows)[0]
}

export async function updateManufacturer(
  id: number,
  fields: { name?: string; category?: string; logo_url?: string | null; price_list_url?: string | null; price_list_effective_date?: string | null }
): Promise<Manufacturer | null> {
  const current = await getManufacturerById(id)
  if (!current) return null
  const name    = fields.name           !== undefined ? fields.name           : current.name
  const cat     = fields.category       !== undefined ? fields.category       : current.category
  const logoUrl = fields.logo_url       !== undefined ? fields.logo_url       : current.logo_url
  const plUrl   = fields.price_list_url !== undefined ? fields.price_list_url : current.price_list_url
  const plDate  = fields.price_list_effective_date !== undefined ? fields.price_list_effective_date : current.price_list_effective_date
  const rows = await sql`
    UPDATE manufacturers SET name=${name}, category=${cat}, logo_url=${logoUrl}, price_list_url=${plUrl}, price_list_effective_date=${plDate}
    WHERE id=${id} RETURNING *
  `
  return cast<Manufacturer[]>(rows)[0] ?? null
}

export async function deleteManufacturer(id: number): Promise<void> {
  await sql`DELETE FROM manufacturers WHERE id = ${id}`
}

// ─── Manufacturer Tiers ───────────────────────────────────────────────────────

export async function getTiersForManufacturer(manufacturerId: number): Promise<ManufacturerTier[]> {
  const rows = await sql`
    SELECT * FROM manufacturer_tiers WHERE manufacturer_id = ${manufacturerId} ORDER BY sort_order, tier_name
  `
  return cast<ManufacturerTier[]>(rows)
}

export async function getTiersForManufacturers(manufacturerIds: number[]): Promise<Record<number, ManufacturerTier[]>> {
  if (manufacturerIds.length === 0) return {}
  const rows = await sql`
    SELECT * FROM manufacturer_tiers WHERE manufacturer_id = ANY(${manufacturerIds}) ORDER BY sort_order, tier_name
  `
  const tiers = cast<ManufacturerTier[]>(rows)
  const grouped: Record<number, ManufacturerTier[]> = {}
  for (const t of tiers) {
    if (!grouped[t.manufacturer_id]) grouped[t.manufacturer_id] = []
    grouped[t.manufacturer_id].push(t)
  }
  return grouped
}

export async function createTier(manufacturerId: number, tierName: string, sortOrder = 0): Promise<ManufacturerTier> {
  const rows = await sql`
    INSERT INTO manufacturer_tiers (manufacturer_id, tier_name, sort_order)
    VALUES (${manufacturerId}, ${tierName}, ${sortOrder})
    RETURNING *
  `
  return cast<ManufacturerTier[]>(rows)[0]
}

export async function updateTier(
  id: number,
  fields: { tier_name?: string; price_list_url?: string | null; price_list_effective_date?: string | null; sort_order?: number }
): Promise<ManufacturerTier | null> {
  const rows = await sql`SELECT * FROM manufacturer_tiers WHERE id = ${id} LIMIT 1`
  const current = cast<ManufacturerTier[]>(rows)[0]
  if (!current) return null
  const name   = fields.tier_name      !== undefined ? fields.tier_name      : current.tier_name
  const plUrl  = fields.price_list_url !== undefined ? fields.price_list_url : current.price_list_url
  const plDate = fields.price_list_effective_date !== undefined ? fields.price_list_effective_date : current.price_list_effective_date
  const order  = fields.sort_order     !== undefined ? fields.sort_order     : current.sort_order
  const updated = await sql`
    UPDATE manufacturer_tiers SET tier_name=${name}, price_list_url=${plUrl}, price_list_effective_date=${plDate}, sort_order=${order}
    WHERE id=${id} RETURNING *
  `
  return cast<ManufacturerTier[]>(updated)[0] ?? null
}

export async function deleteTier(id: number): Promise<void> {
  await sql`DELETE FROM manufacturer_tiers WHERE id = ${id}`
}

// ─── Dealer ↔ Manufacturer ────────────────────────────────────────────────────

// Returns manufacturers with their assigned tier info for a dealer
export async function getDealerManufacturers(dealerId: number): Promise<(Manufacturer & { tier_id: number | null; tier_price_list_url: string | null; tier_price_list_effective_date: string | null })[]> {
  const rows = await sql`
    SELECT m.*, dm.tier_id,
           mt.price_list_url AS tier_price_list_url,
           mt.price_list_effective_date AS tier_price_list_effective_date
    FROM manufacturers m
    JOIN dealer_manufacturers dm ON dm.manufacturer_id = m.id
    LEFT JOIN manufacturer_tiers mt ON mt.id = dm.tier_id
    WHERE dm.dealer_id = ${dealerId}
    ORDER BY m.category, m.name
  `
  return cast<(Manufacturer & { tier_id: number | null; tier_price_list_url: string | null; tier_price_list_effective_date: string | null })[]>(rows)
}

// Returns just the manufacturer IDs a dealer is assigned to
export async function getDealerManufacturerIds(dealerId: number): Promise<number[]> {
  const rows = await sql`SELECT manufacturer_id FROM dealer_manufacturers WHERE dealer_id = ${dealerId}`
  return cast<{ manufacturer_id: number }[]>(rows).map(r => r.manufacturer_id)
}

// Returns tier assignments: manufacturerId -> tierId
export async function getDealerTierAssignments(dealerId: number): Promise<Record<number, number>> {
  const rows = await sql`
    SELECT manufacturer_id, tier_id FROM dealer_manufacturers
    WHERE dealer_id = ${dealerId} AND tier_id IS NOT NULL
  `
  const map: Record<number, number> = {}
  for (const r of cast<{ manufacturer_id: number; tier_id: number }[]>(rows)) {
    map[r.manufacturer_id] = r.tier_id
  }
  return map
}

export async function setDealerManufacturers(
  dealerId: number,
  assignments: { manufacturerId: number; tierId?: number | null }[]
): Promise<void> {
  await sql`DELETE FROM dealer_manufacturers WHERE dealer_id = ${dealerId}`
  for (const { manufacturerId, tierId } of assignments) {
    await sql`
      INSERT INTO dealer_manufacturers (dealer_id, manufacturer_id, tier_id)
      VALUES (${dealerId}, ${manufacturerId}, ${tierId ?? null})
      ON CONFLICT DO NOTHING
    `
  }
}

// ─── Admins ───────────────────────────────────────────────────────────────────

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const rows = await sql`SELECT * FROM admins WHERE LOWER(email) = LOWER(${email}) LIMIT 1`
  return cast<Admin[]>(rows)[0] ?? null
}
