import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";

import { CompetitorCard } from "@/components/competitor-card";
import { LeaderHero } from "@/components/leader-hero";
import { Reveal, Stagger } from "@/components/motion";
import { RaceChart } from "@/components/race-chart";
import { VersusBars } from "@/components/versus-bars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/dal";
import { getScoreboard } from "@/lib/db/queries";

export const metadata = { title: "Standings · Comp" };

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const board = getScoreboard();

  const opponentMissing = board.standings.length < 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-muted-foreground">Head to head</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">Standings</h1>
        </div>
        <Button asChild variant="volt" size="lg">
          <Link href="/log">
            <Plus data-icon="inline-start" aria-hidden />
            Log today
          </Link>
        </Button>
      </div>

      {opponentMissing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4" aria-hidden />
              It takes two
            </CardTitle>
            <CardDescription>
              {viewer.isAdmin
                ? "Create your opponent's account and the race can start."
                : "The admin still needs to add a second competitor."}
            </CardDescription>
          </CardHeader>
          {viewer.isAdmin && (
            <CardContent>
              <Button asChild size="sm" variant="secondary">
                <Link href="/admin">Add opponent</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* The broadsheet: on a wide screen the verdict and the evidence sit side
          by side rather than a screen apart. Below lg it all collapses back to
          one column in the same reading order — leader, race, competitors.

          The reveal order follows that same reading order rather than the DOM's
          grid positions, so the page assembles the way it's meant to be read:
          who's winning, then the proof, then the detail. */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <LeaderHero board={board} />
        </Reveal>

        <Reveal className="lg:col-span-7" delay={0.08}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">The race</CardTitle>
              <CardDescription>
                Percent of starting weight lost. Higher is better — the gap between the lines is
                the lead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RaceChart standings={board.standings} />
            </CardContent>
          </Card>
        </Reveal>

        <Stagger
          className="grid gap-4 sm:grid-cols-2 lg:col-span-6 lg:content-start"
          from={0.16}
        >
          {board.standings.map((standing, i) => (
            <CompetitorCard
              key={standing.userId}
              standing={standing}
              rank={i + 1}
              isViewer={standing.userId === viewer.id}
            />
          ))}
        </Stagger>

        {board.standings.length > 1 && (
          <VersusBars
            standings={board.standings}
            className="grid gap-4 sm:grid-cols-2 lg:col-span-6 lg:content-start"
            from={0.28}
          />
        )}
      </div>
    </div>
  );
}
