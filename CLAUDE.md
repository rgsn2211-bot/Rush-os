@AGENTS.md

# Rush OS — project guide for Claude Code

Rush OS is the internal operating system for **Rush**, a small specialty coffee
shop (car pickup + delivery-app orders). It is **not** a customer ordering app.
Two interfaces: a **worker tablet** app and an **owner dashboard** (desktop/tablet/phone).

The owner is newer to this stack — prefer clear, explained changes over clever ones.

## Tech stack (see docs/architecture/decisions/0001-initial-stack.md)

Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · Supabase
(Postgres + Auth + Storage) · Vercel · Zod · Vitest. Two external services only:
Supabase + Vercel.

## Architecture rules (do not violate)

- **Business logic lives in `src/services/` and `src/lib/calculations/`** — never in
  UI components or API route handlers. Routes are thin: validate -> call service -> respond.
- **Only `src/repositories/` touches the database.** Services call repositories.
- **Validate all input with Zod** (`src/lib/validators/`).
- **Money is integer fils** (BHD x 1000). Use `src/lib/calculations/currency.ts`.
  Never do money math in floating-point BHD. Display always 3 decimals.
- **Permissions are enforced in the database (RLS)** and re-checked in services —
  not merely hidden in the UI. Workers must never access financial/profit data.
- Keep all migrations, types, parsers, and business rules **in the repo** — never
  hide critical logic in the Supabase/Vercel dashboards.

## Business rules that bite (full list in the product brief)

- POS **Sales By Item** drives item quantities, recipe-based inventory usage, and COGS.
  It is **not** the official revenue record — **Daily EOD** is.
- **Complimentary items are already counted in Sales By Item.** Never deduct inventory
  for them a second time. The complimentary report is monetary control only (it has no items).
- Inventory becomes COGS as it is sold/used/wasted — a purchase is not immediately COGS.
- Costing and valuation use **weighted-average confirmed cost**.
- Worker submissions are recorded with who+timestamp, notify the owner, and go to
  **Owner Review**; voids reverse effects but keep an audit record.
- POS imports must be **idempotent** — never double-deduct on reprocess.

## Workflow

- Develop on the assigned feature branch. Commit clearly. Push when a phase is done.
- Before committing: `npm run typecheck && npm run lint && npm run test`.
- Generate DB types after migrations: `npm run db:types`.
- Never commit secrets, real financial exports, PINs, or customer/employee PII.
  Use `.env.local` (git-ignored); document new vars in `.env.example`.

## Where things are

- Design reference: `docs/design/` (prototype + screenshots). Match it; don't redesign.
- POS pipeline spec: `docs/pos/file-structure.md`.
- Architecture decisions: `docs/architecture/decisions/`.
- Layer guide: `src/README.md`.
