import { neon } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? 'postgresql://placeholder/placeholder'
export const sql = neon(connectionString)

export interface Dealer {
  id: number
  first_name: string
  last_name: string
  email: string
  company: string
  password_hash: string
  is_active: boolean
  created_at: string
}

export interface Manufacturer {
  id: number
  name: string
  category: string
  logo_url: string | null
  price_list_url: string | null
  created_at: string
}

export interface Admin {
  id: number
  email: string
  password_hash: string
}

// ─── Dealers ─────────────────────────────────────────────────────────────────

export async function getDealerByEmail(email: string): Promise<Dealer | null> {
  const rows = await sql`
    SELECT * FROM dealers WHERE LOWER(email) = LOWER(${email}) AND is_active = true LIMIT 1
  `
  return (rows[0] as Dealer) ?? null
}

export async function getAllDealers(): Promise<(Dealer & { manufacturer_count: number })[]> {
  const rows = await sql`
    SELECT d.*, COUNT(dm.manufacturer_id)::int AS manufacturer_count
    FROM dealers d
    LEFT JOIN dealer_manufacturers dm ON dm.dealer_id = d.id
    GROUP BY d.id
    ORDER BY d.company, d.last_name, d.first_name
  `
  return rows as (Dealer & { manufacturer_count: number })[]
}

export async function getDealerById(id: number): Promise<Dealer | null> {
  const rows = await sql`SELECT * FROM dealers WHERE id = ${id} LIMIT 1`
  return (rows[0] as Dealer) ?? null
}

export async function createDealer(
  firstName: string,
  lastName: string,
  email: string,
  company: string,
  passwordHash: string,
  isActive = false
): Promise<Dealer | null> {
  const rows = await sql`
    INSERT INTO dealers (first_name, last_name, email, company, password_hash, is_active)
    VALUES (${firstName}, ${lastName}, ${email.toLowerCase()}, ${company}, ${passwordHash}, ${isActive})
    ON CONFLICT (email) DO NOTHING
    RETURNING *
  `
  return (rows[0] as Dealer) ?? null
}

export async function updateDealer(
  id: number,
  fields: {
    first_name?: string
    last_name?: string
    company?: string
    is_active?: boolean
    password_hash?: string
  }
): Promise<Dealer | null> {
  const current = await getDealerById(id)
  if (!current) return null

  const fn = fields.first_name    ?? current.first_name
  const ln = fields.last_name     ?? current.last_name
  const co = fields.company       ?? current.company
  const ia = fields.is_active     ?? current.is_active
  const ph = fields.password_hash ?? current.password_hash

  const rows = await sql`
    UPDATE dealers
    SET first_name = ${fn}, last_name = ${ln}, company = ${co},
        is_active = ${ia}, password_hash = ${ph}
    WHERE id = ${id}
    RETURNING *
  `
  return (rows[0] as Dealer) ?? null
}

export async function deleteDealer(id: number): Promise<void> {
  await sql`DELETE FROM dealers WHERE id = ${id}`
}

// ─── Manufacturers ────────────────────────────────────────────────────────────

export async function getAllManufacturers(): Promise<Manufacturer[]> {
  const rows = await sql`SELECT * FROM manufacturers ORDER BY category, name`
  return rows as Manufacturer[]
}

export async function getManufacturerById(id: number): Promise<Manufacturer | null> {
  const rows = await sql`SELECT * FROM manufacturers WHERE id = ${id} LIMIT 1`
  return (rows[0] as Manufacturer) ?? null
}

export async function createManufacturer(
  name: string,
  category: string,
  logoUrl?: string,
  priceListUrl?: string
): Promise<Manufacturer> {
  const rows = await sql`
    INSERT INTO manufacturers (name, category, logo_url, price_list_url)
    VALUES (${name}, ${category}, ${logoUrl ?? null}, ${priceListUrl ?? null})
    RETURNING *
  `
  return rows[0] as Manufacturer
}

export async function updateManufacturer(
  id: number,
  fields: { name?: string; category?: string; logo_url?: string | null; price_list_url?: string | null }
): Promise<Manufacturer | null> {
  const current = await getManufacturerById(id)
  if (!current) return null

  const name    = fields.name           !== undefined ? fields.name           : current.name
  const cat     = fields.category       !== undefined ? fields.category       : current.category
  const logoUrl = fields.logo_url       !== undefined ? fields.logo_url       : current.logo_url
  const plUrl   = fields.price_list_url !== undefined ? fields.price_list_url : current.price_list_url

  const rows = await sql`
    UPDATE manufacturers
    SET name = ${name}, category = ${cat}, logo_url = ${logoUrl}, price_list_url = ${plUrl}
    WHERE id = ${id}
    RETURNING *
  `
  return (rows[0] as Manufacturer) ?? null
}

export async function deleteManufacturer(id: number): Promise<void> {
  await sql`DELETE FROM manufacturers WHERE id = ${id}`
}

// ─── Dealer ↔ Manufacturer ────────────────────────────────────────────────────

export async function getDealerManufacturers(dealerId: number): Promise<Manufacturer[]> {
  const rows = await sql`
    SELECT m.* FROM manufacturers m
    JOIN dealer_manufacturers dm ON dm.manufacturer_id = m.id
    WHERE dm.dealer_id = ${dealerId}
    ORDER BY m.category, m.name
  `
  return rows as Manufacturer[]
}

export async function setDealerManufacturers(dealerId: number, manufacturerIds: number[]): Promise<void> {
  await sql`DELETE FROM dealer_manufacturers WHERE dealer_id = ${dealerId}`
  for (const mId of manufacturerIds) {
    await sql`
      INSERT INTO dealer_manufacturers (dealer_id, manufacturer_id)
      VALUES (${dealerId}, ${mId})
      ON CONFLICT DO NOTHING
    `
  }
}

// ─── Admins ───────────────────────────────────────────────────────────────────

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const rows = await sql`SELECT * FROM admins WHERE LOWER(email) = LOWER(${email}) LIMIT 1`
  return (rows[0] as Admin) ?? null
}
