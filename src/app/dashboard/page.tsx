import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.display_name ??
    user.user_metadata?.name ??
    "Hacker";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Here&apos;s what&apos;s happening with your projects.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* My Projects */}
          <section className="rounded-lg bg-elevated p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground">My Projects</h2>
              <Button asChild size="sm">
                <Link href="/projects/new">New Project</Link>
              </Button>
            </div>
            <p className="text-sm text-secondary">
              Projects you&apos;ve created will appear here.
            </p>
            {/* Project list populated from DB via server query */}
          </section>

          {/* My Memberships */}
          <section className="rounded-lg bg-elevated p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground">My Teams</h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">Browse</Link>
              </Button>
            </div>
            <p className="text-sm text-secondary">
              Projects you&apos;ve joined will appear here.
            </p>
            {/* Membership list populated from DB via server query */}
          </section>

          {/* Pending Applications */}
          <section className="rounded-lg bg-elevated p-6 shadow-md md:col-span-2">
            <h2 className="mb-4 font-bold text-foreground">
              Pending Applications
            </h2>
            <p className="text-sm text-secondary">
              Applications you&apos;ve submitted or received will appear here.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
