# Rush OS

Internal operating system for **Rush Specialty Coffee** — a worker tablet app and
an owner dashboard for inventory, recipes, costing, POS imports, daily closing,
money, and reporting. Not a customer ordering app.

- Architecture: `docs/architecture/decisions/0001-initial-stack.md`
- How the code is organized: `src/README.md`
- POS import pipeline: `docs/pos/file-structure.md`
- Design reference: `docs/design/`

Stack: Next.js 16 · TypeScript · Tailwind 4 · Supabase (Postgres + Auth + Storage)
· Vercel. Money is BHD (3 decimals), stored internally as integer fils.

---

## What you need (two free accounts)

1. **Supabase** — your database + login + file storage. https://supabase.com
2. **Vercel** — where the app runs online, deploys from GitHub. https://vercel.com

Nothing else for now. No custom domain needed.

---

## First-time local setup (step by step)

> You run these on your own computer. Each step says what it does.

### 1. Install the tools

- **Node.js 20+** (https://nodejs.org) — runs the app.
- **Docker Desktop** (https://www.docker.com/products/docker-desktop) — runs a
  local copy of Supabase so you can develop safely offline.

### 2. Get the code and install dependencies

```bash
git clone <your-repo-url>
cd Rush-os
npm install
```

### 3. Start a local Supabase (database + auth + storage on your machine)

```bash
npm run db:start
```

The first run downloads Docker images (a few minutes). When it finishes it prints
an **API URL**, an **anon key**, and a **service_role key**. Keep that output open.

### 4. Create your local env file

```bash
cp .env.example .env.local
```

Open `.env.local` and paste the three values from step 3:

- `NEXT_PUBLIC_SUPABASE_URL` → the API URL (usually `http://127.0.0.1:54321`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon key
- `SUPABASE_SERVICE_ROLE_KEY` → the service_role key

`.env.local` is git-ignored — your keys never get committed.

### 5. Apply the database schema

```bash
npm run db:reset
```

(Runs all migrations + seed. There's no schema yet in Phase 0 — that's expected.)

### 6. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — you should see the Rush OS Phase 0 landing page in
the brand colors and IBM Plex fonts.

---

## Everyday commands

| Command                        | What it does                                    |
| ------------------------------ | ----------------------------------------------- |
| `npm run dev`                  | Start the app locally with hot reload.          |
| `npm run test`                 | Run the test suite (Vitest).                    |
| `npm run typecheck`            | Check TypeScript types.                         |
| `npm run lint`                 | Check code with ESLint.                         |
| `npm run format`               | Auto-format code with Prettier.                 |
| `npm run db:start` / `db:stop` | Start/stop local Supabase (Docker).             |
| `npm run db:reset`             | Re-apply all migrations + seed to the local DB. |
| `npm run db:migrate <name>`    | Create a new SQL migration file.                |
| `npm run db:types`             | Regenerate `src/types/database.ts` from the DB. |

Before committing: `npm run typecheck && npm run lint && npm run test`.

---

## Going online later (Supabase cloud + Vercel)

When we're ready to put it on the internet (you don't need to do this in Phase 0):

1. **Supabase cloud**: create a project at supabase.com, then `supabase link` and
   `npm run db:push` to apply the same migrations to the cloud database.
2. **Vercel**: import this GitHub repo at vercel.com, paste the Supabase cloud URL
   and keys into Vercel's Environment Variables, and it deploys on every push.
   You get a free `rush-os-something.vercel.app` URL.

Detailed walkthroughs for both will be added when we reach that step.
