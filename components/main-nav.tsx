"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Plus, Settings, Trophy, Users, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Icons live here rather than in the layout because they can't cross the
 *  server/client boundary as props — a component isn't serialisable. The layout
 *  passes `isAdmin` and this builds the list. */
function itemsFor(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: "Standings", icon: Trophy },
    { href: "/log", label: "Log", icon: Plus },
    { href: "/history", label: "History", icon: History },
  ];
  if (isAdmin) items.push({ href: "/admin", label: "Accounts", icon: Users });
  items.push({ href: "/settings", label: "Settings", icon: Settings });
  return items;
}

/** "/" would prefix-match every route, so it alone has to match exactly. */
function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Desktop: a segmented rail in the header. Volt fills the active pill and the
 *  label goes near-black on top of it — the one contrast-safe way to use volt
 *  on a light surface. */
export function DesktopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
        {itemsFor(isAdmin).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-volt text-volt-foreground"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Mobile: a thumb-reach tab bar pinned to the bottom, which is where a fitness
 * app's navigation belongs — the top of a phone is the hardest place to reach
 * one-handed, and logging happens standing on a scale.
 */
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = itemsFor(isAdmin);

  return (
    <nav
      aria-label="Main"
      // pb keeps the bar clear of the iOS home indicator; without it the last
      // few pixels of the tap target sit under the system gesture area.
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                // min-h-14 keeps every tab past the 44px touch-target floor.
                className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2"
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    // The active tab is a volt lozenge behind a near-black
                    // glyph. Tinting the glyph itself volt would be 1.18:1 on
                    // the light surface and effectively invisible.
                    active ? "bg-volt text-volt-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-none font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
