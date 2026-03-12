import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
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

  // Placeholder structure — replace with real data
  const project = null as {
    id: string;
    title: string;
    description: string;
    tech_stack: string[];
    first_milestone: string;
    time_commitment: string;
    status: string;
    owner_display_name: string;
    slack_channel_url: string | null;
    repo_url: string | null;
    created_at: string;
    last_active_at: string;
    roles: {
      id: string;
      title: string;
      description: string;
      required_skills: string[];
      is_filled: boolean;
    }[];
    members: {
      user_id: string;
      display_name: string;
      role_title: string;
    }[];
  } | null;

  if (!project) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Status + title */}
        <div className="mb-6">
          <Badge
            variant={project.status === "recruiting" ? "success" : "default"}
          >
            {project.status}
          </Badge>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {project.title}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            by {project.owner_display_name} · Created{" "}
            {new Date(project.created_at).toLocaleDateString()} · Active{" "}
            {new Date(project.last_active_at).toLocaleDateString()}
          </p>
        </div>

        {/* Tech stack */}
        <div className="mb-6 flex flex-wrap gap-2">
          {project.tech_stack.map((tech) => (
            <Badge key={tech} variant="outline">
              {tech}
            </Badge>
          ))}
          <Badge variant="outline">{project.time_commitment}</Badge>
        </div>

        {/* Description */}
        <section className="mb-8 rounded-lg bg-elevated p-6 shadow-md">
          <h2 className="mb-3 font-bold text-foreground">About</h2>
          <p className="whitespace-pre-wrap text-sm text-foreground leading-body">
            {project.description}
          </p>
        </section>

        {/* First milestone */}
        <section className="mb-8 rounded-lg bg-sunken p-6">
          <h2 className="mb-2 font-bold text-foreground">First Milestone</h2>
          <p className="text-sm text-foreground">{project.first_milestone}</p>
        </section>

        {/* Links */}
        <div className="mb-8 flex gap-4">
          {project.slack_channel_url && (
            <a
              href={project.slack_channel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-accent hover:underline"
            >
              Slack Channel ↗
            </a>
          )}
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-accent hover:underline"
            >
              GitHub Repo ↗
            </a>
          )}
        </div>

        {/* Open roles */}
        <section className="mb-8">
          <h2 className="mb-4 font-bold text-foreground">Open Roles</h2>
          <div className="grid gap-3">
            {project.roles
              .filter((r) => !r.is_filled)
              .map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-elevated p-4"
                >
                  <div>
                    <h3 className="font-bold text-foreground">{role.title}</h3>
                    {role.description && (
                      <p className="mt-1 text-sm text-secondary">
                        {role.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {role.required_skills.map((s) => (
                        <Badge key={s} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm">Apply</Button>
                </div>
              ))}
            {project.roles.filter((r) => !r.is_filled).length === 0 && (
              <p className="text-sm text-secondary">
                All roles are currently filled.
              </p>
            )}
          </div>
        </section>

        {/* Team */}
        <section>
          <h2 className="mb-4 font-bold text-foreground">Team</h2>
          <div className="grid gap-2">
            {project.members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 rounded-md p-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sunken text-sm font-bold">
                  {m.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {m.display_name}
                  </p>
                  <p className="text-xs text-muted">{m.role_title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
