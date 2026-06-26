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
  for them a second time. Complimentary logs track the monetary value and link to
  a product when one is selected (or a free-text description for custom items).
  Workers pick from the products table or tap "Other" for custom entries.
- Inventory becomes COGS as it is sold/used/wasted — a purchase is not immediately COGS.
- Costing and valuation use **weighted-average confirmed cost**.
- Worker submissions are recorded with who+timestamp, notify the owner, and go to
  **Owner Review**; voids reverse effects but keep an audit record.
  Workers can delete their own pending (`needs_review`) complimentary logs before
  the owner reviews them.
- POS imports must be **idempotent** — never double-deduct on reprocess.
- **Daily Closing** is not yet implemented (placeholder on the worker home screen).
  Do not build features that depend on a daily-close having run.

## Workflow

- Develop on the assigned feature branch. Commit clearly. Push when a phase is done.
- Before committing: `npm run typecheck && npm run lint && npm run test`.
- Generate DB types after migrations: `npm run db:types`.
- **Migration filenames**: use consistent format. Never mix short (`20260625_`)
  and long (`20260625100000_`) version prefixes for the same date — the Supabase
  CLI can't match them. One migration per version number; no duplicates.
- Never commit secrets, real financial exports, PINs, or customer/employee PII.
  Use `.env.local` (git-ignored); document new vars in `.env.example`.

## Where things are

- Design reference: `docs/design/` (prototype + screenshots). Match it; don't redesign.
- POS pipeline spec: `docs/pos/file-structure.md`.
- Architecture decisions: `docs/architecture/decisions/`.
- Layer guide: `src/README.md`.

## Feature status

**Built and working:**
- Inventory management (owner CRUD, worker read-only view, alerts)
- Products + recipes (owner CRUD, linked to inventory items)
- Suppliers (owner CRUD, worker read-only)
- Purchases / receive stock (worker submit → owner review)
- POS import pipeline (XLSX upload → item mapping → inventory deduction)
- POS upload calendar (interactive date selection, date validation)
- Complimentary logging (worker picks product or "Other", logs with reason,
  can delete own pending entries; owner reviews/approves/rejects)
- Record Waste (worker submit → owner review → stock deduction on approve)
- Daily Closing / EOD (worker wizard: per-payment-method amounts AND order
  counts — cash, card, BenefitPay, and one row per delivery platform — optional
  Sales By Item XLSX upload step, cash count, review; owner reviews/approves.
  The official daily revenue record; approving does not touch inventory.
  Approving posts cash sales into the register and auto-creates pending
  settlements per channel/platform — see Money.)
- Worker Cash Out from Register (purchase or withdrawal → owner review →
  register cash-out movement on approve)
- Delivery Apps (owner): Settings (per-platform commission % + fixed fee/order,
  active toggle; seeded Jahez/Talabat/Keeta/Beanz), Report (per-platform gross /
  commission / net / received / pending), Settlement (multi-day reconcile).
- Money (owner): Overview (register + bank = total money "have", plus pending
  settlements "still owed" and "should have"), Cash Flow (settlements +
  projection), Money Out (purchases / expenses / payables), Cash Log (manual
  movements per account + register→bank deposit), Upcoming Costs (recurring).
  Money lives in two accounts: register and bank. Confirming/reconciling a
  settlement posts the received amount into the bank.
- Owner mobile "More" menu (slide-up sheet for pages not in bottom nav)

**Not yet built (placeholders only):**
- Mark Item Opened, Inventory Count (worker quick actions)
- Profit Reports, Losses, AI Insights (owner pages)
