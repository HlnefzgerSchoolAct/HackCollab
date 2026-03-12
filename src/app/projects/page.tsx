import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
};

/**
 * Project discovery feed.
 * At MVP this shows all recruiting/active projects.
 * Filtering by tech stack, availability, and search term
 * will query the project_summary materialized view.
 */
export default function ProjectsPage() {
  // TODO: fetch from Supabase project_summary view with filters
  const projects: {
    id: string;
    title: string;
    tech_stack: string[];
    time_commitment: string;
    open_roles: number;
    active_members: number;
    owner_display_name: string;
    last_active_at: string;
  }[] = [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-secondary">
              Find a project that matches your skills.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-placeholder" />
            <Input
              placeholder="Search projects..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="rounded-lg bg-sunken p-12 text-center">
            <p className="text-secondary">
              No projects yet. Be the first to{" "}
              <Link href="/projects/new" className="font-bold text-primary hover:underline">
                create one
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg bg-elevated p-5 shadow-md transition-transform hover:scale-[1.01] hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-foreground">{project.title}</h2>
                    <p className="mt-1 text-sm text-secondary">
                      by {project.owner_display_name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {project.tech_stack.map((tech) => (
                        <Badge key={tech} variant="outline">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-foreground">
                      {project.open_roles} open role{project.open_roles !== 1 && "s"}
                    </p>
                    <p className="text-muted">
                      {project.active_members} member{project.active_members !== 1 && "s"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
