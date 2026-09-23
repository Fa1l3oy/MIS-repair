import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * NextAuth names its cookie "__Secure-…" when the site's origin is https. Mirror
 * how it detects the origin (NEXTAUTH_URL, else the forwarded protocol when
 * AUTH_TRUST_HOST is on) so we look up the same cookie it set.
 */
function usesSecureCookie(request: NextRequest) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.startsWith("https://");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return proto === "https";
}

// Coarse gate: only checks that a session cookie exists. Role checks happen in
// layouts/pages/actions because they read the always-fresh role from the DB.
// (Signed-in users visiting /login are redirected by the page itself, so a
// deactivated account can still reach the login page.)
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: usesSecureCookie(request),
  });
  if (!token) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
