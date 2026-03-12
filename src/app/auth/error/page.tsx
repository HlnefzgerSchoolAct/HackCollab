import Link from "next/link";

export default function AuthError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="rounded-lg bg-sunken p-8 text-center shadow-md">
        <h1 className="mb-2 text-xl font-bold text-destructive">
          Authentication Error
        </h1>
        <p className="mb-6 text-secondary">
          Something went wrong during sign-in. Please try again.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-md transition-transform hover:scale-105 hover:shadow-lg"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
