import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler for Hack Club OIDC.
 *
 * Flow:
 * 1. User clicks "Sign in with Hack Club"
 * 2. Supabase redirects to Hack Club's OIDC authorize endpoint
 * 3. User authenticates at Hack Club
 * 4. Hack Club redirects back here with an auth code
 * 5. We exchange the code for a session
 * 6. Redirect to the originally requested page (or /dashboard)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";
  const debugAuth = process.env.NEXT_PUBLIC_DEBUG_AUTH === "true";

  if (debugAuth) {
    console.log("[auth-debug] Callback received", {
      hasCode: Boolean(code),
      next,
      origin,
      forwardedHost: request.headers.get("x-forwarded-host"),
    });
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (debugAuth) {
        console.log("[auth-debug] Code exchange succeeded", { next });
      }
      // Successful auth — redirect to the intended destination
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    if (debugAuth) {
      console.error("[auth-debug] Code exchange failed", {
        message: error.message,
      });
    }
  }

  // Auth failed — redirect to error page
  if (debugAuth) {
    console.log("[auth-debug] Redirecting to auth error page");
  }
  return NextResponse.redirect(`${origin}/auth/error`);
}
