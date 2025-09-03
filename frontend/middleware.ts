import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // For now, we'll use a simple cookie-based auth check
  // In production, this would integrate with NextAuth
  const isAuthenticated = request.cookies.get("authToken")
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/about",
    "/contact",
    "/explore",
    "/actors",
    "/casting-directors",
    "/producers",
    "/privacy",
    "/terms"
  ]
  
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // Auth routes that should redirect if already authenticated
  const authRoutes = ["/login", "/signup"]
  const isAuthRoute = authRoutes.some(route => pathname === route)
  
  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  
  // Allow access to public routes and API routes
  if (isPublicRoute || pathname.startsWith("/api")) {
    return NextResponse.next()
  }
  
  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}