import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Griffith Sales Associates – Dealer Portal',
  description: 'Authorized dealer portal for Griffith Sales Associates',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
