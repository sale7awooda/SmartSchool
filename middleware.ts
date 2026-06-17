import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const start = Date.now()

  const response = await updateSession(request)

  const duration = Date.now() - start
  response.headers.set('X-Response-Time', `${duration}ms`)

  if (duration > 1000) {
    console.warn(`[SLOW] ${request.method} ${request.nextUrl.pathname} took ${duration}ms`)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!monitoring|_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
