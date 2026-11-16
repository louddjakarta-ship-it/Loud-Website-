import { NextResponse, type NextRequest } from "next/server";

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
 * 1. Refresh the Supabase session cookie.
 * 2. Optimistically redirect anonymous visitors away from admin pages.
 * 3. Return 401 for anonymous admin API calls.
 *
 * It is NOT the authorization layer: role and is_active checks happen again in
 * `src/app/admin/layout.tsx` and in every server action / route handler.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const isLogin = pathname === LOGIN_PATH;

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

  if (!user && !isLogin) {
    if (isApi) {
      return unauthorizedJson();
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (user && isLogin) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";

    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
