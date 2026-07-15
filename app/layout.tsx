import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { DesktopNav, MobileNav } from "@/components/main-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { Toaster } from "@/components/ui/sonner";
import { getViewer } from "@/lib/auth/dal";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Comp",
  description: "A two-person weight-loss competition",
};

export const viewport: Viewport = {
  // The header is translucent and sticky, so the phone's own chrome should sit
  // on the same surface rather than flash a white bar above a dark page.
  // These must track --background in globals.css; they're the sRGB of
  // oklch(1 0 0) and oklch(0.145 0 0) respectively.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Every route reads the local SQLite file and must always be fresh. Without
// this, Next prerenders /_not-found at build time, where no database exists.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Chrome only. Layouts don't re-render on navigation, so this is deliberately
  // not the access check — every page calls requireViewer for that.
  const viewer = await getViewer();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight"
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-volt text-volt-foreground">
                  <Trophy className="size-4" aria-hidden />
                </span>
                Comp
              </Link>

              {viewer && <DesktopNav isAdmin={viewer.isAdmin} />}

              <div className="ml-auto flex shrink-0 items-center gap-1">
                {viewer && <UserMenu viewer={viewer} />}
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* The bottom padding on mobile reserves the tab bar's height, so the
              last card can still be scrolled out from under it. */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-12">
            {children}
          </main>

          {viewer && <MobileNav isAdmin={viewer.isAdmin} />}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
