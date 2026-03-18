import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> =
  {
    invalid_state: {
      title: "Security Error: Invalid State",
      description:
        "The security state parameter was missing or invalid. This may indicate a CSRF attack or session timeout. Please start over and try again.",
    },
    invalid_code: {
      title: "Authentication Error",
      description:
        "The authorization code was invalid. Please try signing in again.",
    },
    default: {
      title: "Authentication Error",
      description: "Something went wrong during sign-in. Please try again.",
    },
  };

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "default";
  const errorMessage = ERROR_MESSAGES[error] || ERROR_MESSAGES.default;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="rounded-lg bg-sunken p-8 text-center shadow-md">
        <h1 className="mb-2 text-xl font-bold text-destructive">
          {errorMessage.title}
        </h1>
        <p className="mb-6 text-secondary">{errorMessage.description}</p>
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

export default function AuthError() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
