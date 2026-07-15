import { LogOut } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { Viewer } from "@/lib/auth/dal";

export function UserMenu({ viewer }: { viewer: Viewer }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: viewer.color }}
        />
        <span className="hidden sm:inline">{viewer.name}</span>
      </span>

      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label="Log out"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
