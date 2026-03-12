import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

/**
 * Profile page — shows the authenticated user's profile.
 * Corresponds to the Tier 1/2 onboarding flow:
 * - Skills, availability (Tier 1, required for actions)
 * - Bio, GitHub link (Tier 2, optional enrichment)
 * - Project history (auto-populated)
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // TODO: fetch full profile from public.users
  // const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();

  const displayName =
    user.user_metadata?.display_name ??
    user.user_metadata?.name ??
    "Hacker";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Profile header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sunken text-2xl font-bold text-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-secondary">Hack Club Member</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Skills + Availability */}
          <section className="rounded-lg bg-elevated p-6 shadow-md">
            <h2 className="mb-4 font-bold text-foreground">
              Skills & Availability
            </h2>
            <p className="text-sm text-secondary">
              Set your skills and weekly availability to get matched with
              projects. This feature is coming soon.
            </p>
            {/* TODO: editable skills picker + availability selector */}
          </section>

          {/* GitHub Link */}
          <section className="rounded-lg bg-elevated p-6 shadow-md">
            <h2 className="mb-4 font-bold text-foreground">GitHub</h2>
            <p className="text-sm text-secondary">
              Link your GitHub account to show your repos and contributions.
              This feature is coming soon.
            </p>
            {/* TODO: GitHub OAuth link flow */}
          </section>

          {/* Project History */}
          <section className="rounded-lg bg-elevated p-6 shadow-md md:col-span-2">
            <h2 className="mb-4 font-bold text-foreground">Project History</h2>
            <p className="text-sm text-secondary">
              Your completed and active projects will appear here once
              project features are live.
            </p>
            {/* TODO: fetch from members + projects tables */}
          </section>
        </div>
      </main>
    </>
  );
}
