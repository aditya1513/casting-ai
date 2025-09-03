import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/login", "/auth/register", "/about", "/contact"]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Auth routes that should redirect if already authenticated
  const authRoutes = ["/auth/login", "/auth/register"]
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}