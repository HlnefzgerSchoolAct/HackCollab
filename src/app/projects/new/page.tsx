import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Project",
};

/**
 * Project creation wizard — 4-step flow.
 * Step 1: Title + Description
 * Step 2: Milestone + Tech Stack + Time Commitment
 * Step 3: Define Roles
 * Step 4: Review + Publish
 *
 * Uses the create_project() DB function which enforces:
 * - 10-minute creation cooldown
 * - Max 5 active projects per user
 * - User must be active
 */
export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-xl font-bold text-foreground">
          Create a Project
        </h1>
        <p className="mb-8 text-sm text-secondary">
          Define what you&apos;re building, set a first milestone, and open
          roles for collaborators.
        </p>

        {/* Wizard steps indicator */}
        <div className="mb-8 flex flex-wrap items-center gap-y-2">
          {["Details", "Scope", "Roles", "Review"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-sunken text-muted"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${
                  i === 0 ? "font-bold text-foreground" : "text-muted"
                }`}
              >
                {step}
              </span>
              {i < 3 && (
                <div className="mx-1 hidden h-px w-6 bg-border sm:block" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Details (default view) */}
        <div className="rounded-lg bg-elevated p-6 shadow-md">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="mb-1.5 block text-sm font-bold text-foreground"
              >
                Project Title
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g., CLI tool for Hack Club Scrapbook"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                minLength={5}
                maxLength={200}
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-bold text-foreground"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={5}
                placeholder="What are you building? What problem does it solve? What's the vision?"
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                minLength={50}
                maxLength={5000}
              />
              <p className="mt-1 text-xs text-muted">Minimum 50 characters</p>
            </div>
          </div>
        </div>

        {/* TODO: implement wizard state management + form submission via create_project() RPC */}
      </main>
    </>
  );
}
