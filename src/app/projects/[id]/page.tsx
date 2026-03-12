import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // TODO: fetch project title from DB
  return { title: `Project ${id}` };
}

/**
 * Project detail page.
 * Shows full description, roles, team members, activity timeline.
 * Authenticated users see an "Apply" button on open roles.
 */
export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  // TODO: fetch project from Supabase
  // const supabase = await createClient();
  // const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  // if (!project) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg bg-sunken p-12 text-center">
          <h1 className="mb-2 text-xl font-bold text-foreground">
            Project Detail
          </h1>
          <p className="mb-1 text-sm text-secondary">
            Project <code className="rounded bg-elevated px-1.5 py-0.5 text-xs">{id}</code>
          </p>
          <p className="mb-6 text-sm text-secondary">
            Project pages are coming soon. Data fetching from Supabase is not
            yet wired up.
          </p>
          <Button asChild variant="outline">
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
