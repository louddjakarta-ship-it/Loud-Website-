import { NextResponse, type NextRequest } from "next/server";

import { buildContentSecurityPolicy, createNonce } from "@/lib/security/csp";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

const LOGIN_PATH = "/admin/login";

function unauthorizedJson() {
  return NextResponse.json(
    {
      ok: false,
      error: { code: "unauthorized", message: "Authentication required." },
    },
    { status: 401 },
  );
}

/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * Responsibilities:
 * 1. Attach a per-request nonce-based Content-Security-Policy to every page.
 * 2. Refresh the Supabase session cookie for admin routes.
 * 3. Optimistically redirect anonymous visitors away from admin pages.
 * 4. Return 401 for anonymous admin API calls.
 *
 * It is NOT the authorization layer: role and is_active checks happen again in
 * `src/app/admin/layout.tsx` and in every server action / route handler.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isAdmin = pathname.startsWith("/admin");

  // The nonce must be generated before rendering so Next.js can attach it to
  // its inline scripts and styles. Setting the header on the request is what
  // Next.js parses during rendering.
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy(nonce);
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  if (!isAdmin && !isApi) {
    const response = NextResponse.next({ request });
    response.headers.set("content-security-policy", csp);

    return response;
  }

  let session: Awaited<ReturnType<typeof updateSupabaseSession>>;

  try {
    session = await updateSupabaseSession(request);
  } catch {
    // Fail closed and keep the message generic. The real cause is logged by
    // the deployment platform, not exposed to the visitor.
    if (isApi) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "admin_unavailable",
            message: "Admin is not configured.",
          },
        },
        { status: 503 },
      );
    }

    return new NextResponse("Admin is not configured.", { status: 503 });
  }

  const { response, user } = session;

  if (!user && !isLoginPath(pathname)) {
    if (isApi) {
      return unauthorizedJson();
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginPath(pathname)) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";

    return NextResponse.redirect(adminUrl);
  }

  response.headers.set("content-security-policy", csp);

  return response;
}

function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    {
      // Every public page. API routes, admin routes, static assets and
      // metadata files are handled above or do not need a document CSP.
      source:
        "/((?!api|admin|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
