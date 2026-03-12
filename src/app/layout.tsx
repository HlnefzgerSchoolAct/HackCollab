import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ec3750",
};

export const metadata: Metadata = {
  title: {
    default: "HackCollab",
    template: "%s | HackCollab",
  },
  description: "Find collaborators. Build together. A structured collaboration platform for Hack Club members.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "HackCollab",
  },
  icons: {
    icon: "https://assets.hackclub.com/favicons/favicon-64x64.png",
    apple: "https://assets.hackclub.com/favicons/apple-touch-icon.png",
  },
};

/**
 * Inline script to prevent flash of wrong theme on initial load.
 * Reads from localStorage before React hydrates.
 */
function ThemeScript() {
  const script = `
    (function() {
      try {
        var t = localStorage.getItem('hackcollab-theme');
        var d = (t === 'dark') || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.add(d ? 'dark' : 'light');
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
