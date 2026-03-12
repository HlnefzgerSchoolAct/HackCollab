import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/user-nav";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-elevated/75 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <svg
            width="24"
            height="24"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="16" height="16" rx="4" fill="var(--hc-red)" />
            <path d="M5 4h2v8H5zM9 4h2v8H9z" fill="white" />
          </svg>
          HackCollab
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link
            href="/projects"
            className="text-sm font-bold text-secondary transition-colors hover:text-foreground"
          >
            Projects
          </Link>
          {user ? (
            <UserNav user={user} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

