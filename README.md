# Comp

A two-person weight-loss competition. Both of you log weight, steps and workout time by
hand; the app works out who's winning.

Next.js + SQLite, self-hosted with Docker on your own VPS. No external database; Cloudflare
Tunnel is the only thing between it and the internet.

## The rule

**Whoever has lost the largest percentage of their starting weight is in first place.**

Percent, not kilograms — a 95kg and a 68kg competitor should have to work equally hard for
the same score, and raw kilograms would hand the heavier person a permanent head start.

Your **starting weight is your first weigh-in**; there's nothing to configure. Everything
else on the dashboard (steps, training time, streaks, goal weight) is context, not score.
A goal weight only drives your own progress meter and never affects the standings.

## Why SQLite on a VPS

The original idea was SQLite on Vercel. That isn't possible — Vercel Functions run on a
read-only filesystem with only an ephemeral `/tmp`, so the database file would vanish
between invocations. Vercel also has no first-party database (even *Vercel Postgres* is
Neon via their Marketplace), so every Vercel path needs an external provider.

A VPS has a real disk, so SQLite works exactly as designed: one file, one process, no
network hop. For two users this is the right architecture, not a compromise.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · better-sqlite3 · Drizzle ORM ·
Tailwind v4 · shadcn/ui · Motion

## Local development

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

The schema migrates itself on boot (`instrumentation.ts`), so there's no setup step. The
first page load lands on `/setup` — see [Accounts](#accounts).

To skip the empty state and get a month of fake history to look at:

```bash
pnpm db:seed        # two competitors, 30 days of entries; password: password123
```

`db:seed` **clears the tables first** — it's for development only.

`DATABASE_PATH` (see `.env.example`) points at the SQLite file — `./data/comp.db` locally,
`/data/comp.db` in the container.

### Checks

```bash
pnpm db:verify      # scoring, password hashing and DB constraints (throwaway database)
pnpm lint
pnpm build
```

## Accounts

There is no public sign-up, and no way to reset a forgotten password from the UI.

1. **The first person to load the app becomes the admin.** `/setup` is only reachable while
   the database has zero users; after that it redirects away, so the door closes behind you.
2. The admin creates the opponent's account from **Accounts** and hands over the password.

Sessions are server-side rows. The cookie holds a random token and the table stores only its
SHA-256 digest, so a stolen database yields no usable cookies. Passwords are scrypt hashes
with a per-user salt.

The app is built as a duel. A third account still gets ranked, but the head-to-head reads
best with two.

## Deploying to the VPS

The **`cloudflared` already running there** fronts this app: it holds an outbound connection
to Cloudflare, and requests arrive back down it. TLS is terminated at Cloudflare's edge, so
this project ships no web server, no certificates and no ACME dance of its own.

Nothing here listens on the public internet. The app publishes **no ports**, and the VPS
needs **no inbound ports open at all** — not even 80 or 443. The tunnel dials out. The box's
IP address is never published either (see step 3), so there's no public surface to find.

**1. Join the tunnel's network.** `cloudflareTunnel` is an external network: this project
only joins it, and compose fails loudly if it's missing. Give the app a free address on it:

```bash
docker network inspect cloudflareTunnel   # the subnet, and what's already on it
cp .env.example .env                      # set APP_IP (and TZ)
docker compose up -d --build
```

`APP_IP` must sit inside that subnet and be unused. Docker hands out dynamic addresses from
the same range and won't give away one already taken, so pick a high host number — on a
collision the container refuses to start rather than quietly moving somewhere else.

**2. Add the ingress rule.** In the `cloudflared` config on the VPS, route the hostname to
that address, above the catch-all, then restart cloudflared:

```yaml
ingress:
  - hostname: comp.stasi-cloud.com
    service: http://172.18.0.20:3000   # your APP_IP
  - service: http_status:404           # must stay last
```

Plain `http://` is correct: that hop is a local Docker network, and the encrypted leg is the
tunnel itself. Because both containers share the network you can also use `http://comp-app:3000`
and skip `APP_IP` entirely — Docker resolves the container name.

Don't set `httpHostHeader` on this rule. It rewrites `Host`, which then no longer matches the
browser's `Origin`, and Next rejects every Server Action as cross-site — the pages load fine
and every form silently fails.

**3. Point DNS at the tunnel.**

```bash
cloudflared tunnel route dns <tunnel-name> comp.stasi-cloud.com
```

That writes a **CNAME** for `comp` to `<tunnel-id>.cfargotunnel.com`, **proxied / orange
cloud** — that target only resolves inside Cloudflare's network, so DNS-only would break it.
There's no `A` record and nothing pointing at the VPS.

`stasi-cloud.com` must be a zone in the same Cloudflare account as the tunnel; it's otherwise
independent of whatever domain your other services use. Keep the app on the `comp`
**subdomain** rather than the apex: the `Strict-Transport-Security` header (now set in
`next.config.ts`) carries `includeSubDomains`, so serving it from `stasi-cloud.com` itself
would force *every* sibling subdomain to HTTPS for a year in any browser that had seen it —
including any still on plain HTTP.

On first boot the container migrates itself, so an empty `./data` volume is all you need.
It starts with **no accounts** on purpose: visit the site and claim the admin account.

Set `TZ` in `.env` to your own timezone. "Today" is decided server-side, so a container left
on UTC can file an evening weigh-in under tomorrow.

## Data model

Three tables. `entries.performed_on` is a `YYYY-MM-DD` **text** column, not a timestamp —
a weigh-in happens on a *day*, which keeps range filtering free of timezone skew.

| Table | Holds |
|---|---|
| `users` | name, scrypt password hash, admin flag, palette slot, optional goal weight |
| `sessions` | SHA-256 of the cookie token, owner, expiry |
| `entries` | one row per person per day: `weight_kg`, `steps`, `workout_min`, `notes` |

Every metric on `entries` is nullable — a day where you only stepped on the scale is still
worth recording. A `UNIQUE(user_id, performed_on)` index backs an upsert, so logging the
same day twice **edits** it rather than creating a duplicate, and a field you leave blank
keeps its stored value instead of wiping it.

Competitor colours are a **palette slot**, not a hex value: each slot resolves to a
different, separately validated step in light and dark mode (`--series-N` in
`app/globals.css`), which one stored colour could never do.

### SQLite settings

`lib/db/index.ts` sets these on every connection — don't remove them, and keep them in this
order:

```
busy_timeout = 5000     wait rather than throwing SQLITE_BUSY — must come first,
                        since setting journal_mode itself takes a write lock
journal_mode = WAL      concurrent reads during writes
foreign_keys = ON       SQLite defaults this OFF
synchronous = NORMAL    safe and fast under WAL
```

Keep the database on a **local** disk. SQLite's locking breaks on NFS and network
filesystems, which corrupts the file.

## Backups

The `backup` sidecar snapshots the database nightly to `./backups`, keeping 14 days:

```sh
sqlite3 /data/comp.db "VACUUM INTO '/backups/comp-$(date +%F).db'"
```

`VACUUM INTO` is safe against a live WAL database. A plain `cp` of a SQLite file can capture
a torn write and silently produce a corrupt copy — don't back up that way.

To restore, stop the app and copy a snapshot over `./data/comp.db` (removing the stale
`-wal`/`-shm` files alongside it).

> Watchtower can't do this job. It updates container *images* from a registry and never
> touches volume data, so it would keep zero copies of your entries. It's a deploy tool,
> not a backup tool.
