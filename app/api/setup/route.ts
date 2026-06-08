import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'

// One-time setup endpoint: creates tables + seeds manufacturers + creates admin
// Call: GET /api/setup
// Protect with a secret: add ?secret=YOUR_SETUP_SECRET to the URL

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')

  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Create tables ────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS manufacturers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL DEFAULT '',
      logo_url TEXT,
      price_list_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS dealers (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL DEFAULT '',
      email VARCHAR(255) UNIQUE NOT NULL,
      company VARCHAR(255) NOT NULL DEFAULT '',
      password_hash VARCHAR(255) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS dealer_manufacturers (
      dealer_id INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
      manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
      PRIMARY KEY (dealer_id, manufacturer_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL
    )
  `

  // ── Seed manufacturers ────────────────────────────────────────────────────
  const manufacturers: [string, string][] = [
    // Audio — Microphones
    ['Audix', 'Audio – Microphones'],
    ['Aston Microphones', 'Audio – Microphones'],
    ['Galaxy Audio', 'Audio – Microphones'],
    ['JTS', 'Audio – Microphones'],
    // Audio — Signal Distribution & Control
    ['Symetrix', 'Audio – Signal Distribution'],
    ['Alfatron', 'Audio – Signal Distribution'],
    ['Midas', 'Audio – Signal Distribution'],
    ['Bluesound Professional', 'Audio – Signal Distribution'],
    ['Audac', 'Audio – Signal Distribution'],
    // Audio — Amplifiers
    ['Powersoft', 'Audio – Amplifiers'],
    ['Lab.gruppen', 'Audio – Amplifiers'],
    ['Sonance', 'Audio – Amplifiers'],
    ['H.S.A.', 'Audio – Amplifiers'],
    // Speakers — Production / Line Array
    ['Alcons Audio', 'Speakers – Production'],
    ['FBT', 'Speakers – Production'],
    ['Axiom', 'Speakers – Production'],
    ['Funktion-One', 'Speakers – Production'],
    ['Renkus-Heinz', 'Speakers – Production'],
    // Speakers — HOW / Commercial
    ['Innovox Audio', 'Speakers – HOW / Commercial'],
    ['James Loudspeaker', 'Speakers – HOW / Commercial'],
    ['OWI', 'Speakers – HOW / Commercial'],
    ['Tannoy', 'Speakers – HOW / Commercial'],
    ['Proel', 'Speakers – HOW / Commercial'],
    ['Studiomaster', 'Speakers – HOW / Commercial'],
    ['Warfedale Pro', 'Speakers – HOW / Commercial'],
    // Lighting — Fixtures
    ['Chauvet Professional', 'Lighting – Fixtures'],
    ['Chauvet DJ', 'Lighting – Fixtures'],
    ['KinoFlo', 'Lighting – Fixtures'],
    ['Iluminarc', 'Lighting – Fixtures'],
    // Lighting — Control
    ['Chamsys', 'Lighting – Control'],
    ['Obey by Chauvet', 'Lighting – Control'],
    ['MediaMaster', 'Lighting – Control'],
    ['Trusst', 'Lighting – Control'],
    // Video — Display
    ['Absen', 'Video – Display'],
    ['Alfatron PTZ Cameras', 'Video – Display'],
    ['Vivitek', 'Video – Display'],
    ['Chauvet Video', 'Video – Display'],
    ['Visionary Solutions', 'Video – Control'],
    // Essentials
    ['FSR', 'Essentials'],
    ['Hollyland', 'Essentials'],
    ['Netgear', 'Essentials'],
    ['iPort', 'Essentials'],
    ['Audinate', 'Essentials'],
    ['Intec Direct Boxes', 'Essentials'],
    // Power
    ['LynTec', 'Power'],
    ['Juice Goose', 'Power'],
    ['Work Pro', 'Power'],
  ]

  let mfrSeeded = 0
  for (const [name, category] of manufacturers) {
    const { rowCount } = await sql`
      INSERT INTO manufacturers (name, category)
      VALUES (${name}, ${category})
      ON CONFLICT DO NOTHING
    `
    mfrSeeded += rowCount ?? 0
  }

  // ── Create admin account ─────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'grant@griffithsales.com'
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD env var not set.' }, { status: 500 })
  }

  const adminHash = await bcrypt.hash(adminPassword, 12)
  const { rowCount: adminRows } = await sql`
    INSERT INTO admins (email, password_hash)
    VALUES (${adminEmail}, ${adminHash})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `

  return NextResponse.json({
    success: true,
    tables_created: ['manufacturers', 'dealers', 'dealer_manufacturers', 'admins'],
    manufacturers_seeded: mfrSeeded,
    admin_created: adminRows ?? 0,
    admin_email: adminEmail,
  })
}
