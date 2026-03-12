"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  async function signInWithHackClub() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "keycloak",
      options: {
        // Supabase doesn't have a native "hackclub" provider, so we use
        // the OIDC provider configured in Supabase dashboard as "keycloak"
        // (or whichever alias maps to Hack Club's OIDC).
        // The scopes request must align with Hack Club's OIDC capabilities.
        scopes: "openid profile email",
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 px-4">
        {/* Logo area */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            HackCollab
          </h1>
          <p className="mt-2 text-base text-secondary">
            Find collaborators. Build together.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="rounded-lg bg-elevated p-8 shadow-md">
          <button
            onClick={signInWithHackClub}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-md transition-transform hover:scale-105 hover:shadow-lg"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8Z"
                fill="currentColor"
                fillOpacity={0.2}
              />
              <path
                d="M5.5 4.5h2v7h-2zM8.5 4.5h2v7h-2z"
                fill="currentColor"
              />
            </svg>
            Sign in with Hack Club
          </button>

          <p className="mt-4 text-center text-sm text-muted">
            You&apos;ll be redirected to Hack Club to authenticate.
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-placeholder">
          Only Hack Club members can sign in.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
