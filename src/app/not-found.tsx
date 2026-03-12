export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="mt-2 text-secondary">Page not found.</p>
      <a
        href="/"
        className="mt-6 rounded-full bg-primary px-6 py-2 font-bold text-primary-foreground shadow-md transition-transform hover:scale-105"
      >
        Go Home
      </a>
    </div>
  );
}
