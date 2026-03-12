"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export function UserNav({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  const displayName =
    user.user_metadata?.display_name ??
    user.user_metadata?.name ??
    user.email ??
    "User";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-sunken text-sm font-bold text-foreground transition-transform hover:scale-110"
        aria-label="User menu"
      >
        {displayName.charAt(0).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-elevated p-1 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-bold text-foreground">{displayName}</p>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-sunken"
          >
            Dashboard
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-sunken"
          >
            Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-sunken"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
