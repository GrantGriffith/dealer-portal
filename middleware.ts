import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /dashboard — requires dealer session cookie
  if (pathname.startsWith('/dashboard')) {
    const dealerCookie = request.cookies.get('gs_dealer')
    if (!dealerCookie?.value) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect /admin/* routes (except /admin login page itself)
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const adminCookie = request.cookies.get('gs_admin')
    if (!adminCookie?.value) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
