"use client";

import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { RANGE_LABELS, RANGES, type Range } from "@/lib/ranges";
import { cn } from "@/lib/utils";

export function RangeTabs({ current }: { current: Range }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "flex shrink-0 gap-0.5 rounded-full bg-muted p-1 transition-opacity",
        pending && "opacity-70",
      )}
    >
      {RANGES.map((range) => {
        const active = range === current;
        return (
          <button
            key={range}
            type="button"
            aria-pressed={active}
            onClick={() => startTransition(() => router.push(`${pathname}?range=${range}`))}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              // Same rule as the nav: the volt pill is a fill and the label on
              // top of it goes near-black. Volt-on-white text would be 1.18:1.
              active ? "text-volt-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="range-pill"
                className="absolute inset-0 rounded-full bg-volt"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative">{RANGE_LABELS[range]}</span>
          </button>
        );
      })}
    </div>
  );
}
