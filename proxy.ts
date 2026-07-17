import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Basic route protection by type
    if (path.startsWith("/dashboard/broker") && token.type !== "BROKER") {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (path.startsWith("/dashboard/carrier") && token.type !== "CARRIER") {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (path.startsWith("/dashboard/shipper") && token.type !== "SHIPPER") {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*", "/api/loads/:path*"],
}
