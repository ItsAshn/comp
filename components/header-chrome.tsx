"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The sticky header's surface. At the top of the page it dissolves into the
 * background — the page opens without a ruled line under its own chrome — and
 * the border fades in only once content actually scrolls under it. The blur
 * stays on throughout: toggling backdrop-filter mid-scroll repaints the whole
 * strip and visibly pops.
 */
export function HeaderChrome({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md transition-colors",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      {children}
    </header>
  );
}
