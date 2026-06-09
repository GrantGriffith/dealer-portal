import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

const manufacturers: [string, string][] = [
  ['Audix', 'Audio – Microphones'],
  ['Aston Microphones', 'Audio – Microphones'],
  ['Galaxy Audio', 'Audio – Microphones'],
  ['JTS', 'Audio – Microphones'],
  ['Symetrix', 'Audio – Signal Distribution'],
  ['Alfatron', 'Audio – Signal Distribution'],
  ['Midas', 'Audio – Signal Distribution'],
  ['Bluesound Professional', 'Audio – Signal Distribution'],
  ['Audac', 'Audio – Signal Distribution'],
  ['Powersoft', 'Audio – Amplifiers'],
  ['Lab.gruppen', 'Audio – Amplifiers'],
  ['Sonance', 'Audio – Amplifiers'],
  ['H.S.A.', 'Audio – Amplifiers'],
  ['Alcons Audio', 'Speakers – Production'],
  ['FBT', 'Speakers – Production'],
  ['Axiom', 'Speakers – Production'],
  ['Funktion-One', 'Speakers – Production'],
  ['Renkus-Heinz', 'Speakers – Production'],
  ['Innovox Audio', 'Speakers – HOW / Commercial'],
  ['James Loudspeaker', 'Speakers – HOW / Commercial'],
  ['OWI', 'Speakers – HOW / Commercial'],
  ['Tannoy', 'Speakers – HOW / Commercial'],
  ['Proel', 'Speakers – HOW / Commercial'],
  ['Studiomaster', 'Speakers – HOW / Commercial'],
  ['Warfedale Pro', 'Speakers – HOW / Commercial'],
  ['Chauvet Professional', 'Lighting – Fixtures'],
  ['Chauvet DJ', 'Lighting – Fixtures'],
  ['KinoFlo', 'Lighting – Fixtures'],
  ['Iluminarc', 'Lighting – Fixtures'],
  ['Chamsys', 'Lighting – Control'],
  ['Obey by Chauvet', 'Lighting – Control'],
  ['MediaMaster', 'Lighting – Control'],
  ['Trusst', 'Lighting – Control'],
  ['Absen', 'Video – Display'],
  ['Alfatron PTZ Cameras', 'Video – Display'],
  ['Vivitek', 'Video – Display'],
  ['Chauvet Video', 'Video – Display'],
  ['Visionary Solutions', 'Video – Control'],
  ['FSR', 'Essentials'],
  ['Hollyland', 'Essentials'],
  ['Netgear', 'Essentials'],
  ['iPort', 'Essentials'],
  ['Audinate', 'Essentials'],
  ['Intec Direct Boxes', 'Essentials'],
  ['LynTec', 'Power'],
  ['Juice Goose', 'Power'],
  ['Work Pro', 'Power'],
]

export async function GET() {
  try {
    // Remove all manufacturer assignments and manufacturers, then re-seed clean
    await sql`DELETE FROM dealer_manufacturers`
    await sql`DELETE FROM manufacturers`
    await sql`ALTER SEQUENCE manufacturers_id_seq RESTART WITH 1`

    for (const [name, category] of manufacturers) {
      await sql`INSERT INTO manufacturers (name, category) VALUES (${name}, ${category})`
    }

    const rows = await sql`SELECT COUNT(*)::int AS count FROM manufacturers`
    return NextResponse.json({
      success: true,
      manufacturers: (rows[0] as { count: number }).count,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
