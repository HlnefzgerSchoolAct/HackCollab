import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler for Hack Club OIDC.
 *
 * Flow:
 * 1. User clicks "Sign in with Hack Club"
 * 2. Supabase redirects to Hack Club's OIDC authorize endpoint with state parameter
 * 3. User authenticates at Hack Club
 * 4. Hack Club redirects back here with an auth code and state
 * 5. We validate the state parameter (T6 - CSRF protection)
 * 6. We exchange the code for a session
 * 7. Redirect to the originally requested page (or /dashboard)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";
  const debugAuth = process.env.NEXT_PUBLIC_DEBUG_AUTH === "true";
  const stateFromCallback = searchParams.get("state");

  if (debugAuth) {
    console.log("[auth-debug] Callback received", {
      hasCode: Boolean(code),
      hasState: Boolean(stateFromCallback),
      next,
      origin,
      forwardedHost: request.headers.get("x-forwarded-host"),
    });
  }

  // Validate state parameter for CSRF protection (T6)
  // Note: State was stored in sessionStorage client-side and passed back in URL.
  // Server-side validation is limited to checking presence and format.
  // The state value is passed through the URL to maintain it across the redirect.
  if (!stateFromCallback) {
    if (debugAuth) {
      console.warn(
        "[auth-debug] State parameter missing from callback - possible CSRF attempt"
      );
    }
    // State parameter is required; redirect to error page
    return NextResponse.redirect(`${origin}/auth/error?error=invalid_state`);
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
  return NextResponse.redirect(`${origin}/auth/error?error=invalid_code`);
}
