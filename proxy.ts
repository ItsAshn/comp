import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed the `middleware` convention to `proxy`. This runs on every
 * matched request, including prefetches, so it performs only an optimistic
 * check — the presence of a cookie, never a database lookup. Real verification
 * happens in lib/auth/dal.ts, next to the data it protects.
 *
 * That makes this safe in one direction only. A missing cookie does prove there
 * is no session, so redirecting to /login costs a wasted page at worst. A
 * present cookie proves nothing — it may be expired, or minted by a sibling
 * subdomain — so bouncing such a request *off* /login would strand it: the DAL
 * would send it straight back here and the two would trade redirects forever,
 * with /login unreachable for precisely the people who need it. Sending a
 * logged-in user home is therefore /login's job, where the session can actually
 * be resolved.
 */

const PUBLIC_PATHS = ["/login", "/setup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.cookies.has("session") || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const url = new URL("/login", request.url);
  // Remember where they were headed so login can return them there.
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals and static assets; without this the redirect above
  // would also swallow CSS and JS requests. The manifest and icon PNGs must
  // stay reachable logged-out too — the browser fetches them cookieless when
  // installing the app to a home screen, and a redirect to /login there means
  // no icon and no install.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.svg$|.*\\.png$).*)"],
};
