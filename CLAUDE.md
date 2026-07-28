@AGENTS.md

# Rush OS — project guide for Claude Code

Rush OS is the internal operating system for **Rush**, a small specialty coffee
shop (car pickup + delivery-app orders). It is **not** a customer ordering app.
Three interfaces, one per role: a **worker tablet** app, an **owner dashboard**
(desktop/tablet/phone), and a **POS Manager** section (`/pos-manager`) for a
trusted non-owner who maintains the catalog and POS mapping.

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
  Three roles (`profiles.role`): `owner` (everything), `pos_manager` (items incl.
  cost, products/recipes incl. cost & margin, POS mapping/imports — but NO Money,
  EOD, settlements, expenses, or profit data), `worker` (operational submissions,
  cost-free views only). Role→section mapping lives in `src/lib/roles.ts`; guards
  are `requireRole`/`requireRoleApi` in `src/lib/auth.ts` plus `src/proxy.ts`.
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
- Inventory management (owner + POS Manager CRUD incl. cost, worker read-only
  cost-free view, alerts)
- Products + recipes (owner + POS Manager CRUD, linked to inventory items)
- POS Manager role (`/pos-manager`: POS mapping/imports home, products,
  inventory; creations are auto-approved with `created_by` recorded — no owner
  review queue. Accounts are provisioned manually: create the Supabase Auth
  user, then `UPDATE profiles SET role = 'pos_manager' WHERE id = ...`)
- Suppliers (owner CRUD, worker read-only)
- Purchases / receive stock (worker submit → owner review; marking paid
  requires choosing cash/bank and auto-deducts from that account; worker
  cash purchases deduct from register on owner approval)
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
  settlement posts the received amount into the bank. Recording an expense
  auto-deducts from the appropriate account (Cash → register, others → bank);
  deleting an expense reverses the deduction.
- Owner mobile "More" menu (slide-up sheet for pages not in bottom nav)
- Inventory Count (worker submits blind count → owner reviews variances on a
  detail page → approve reconciles stock; owner can also "remove record" —
  delete the count but KEEP its stock adjustment — or "void & revert stock")
- Inventory usage ledger (`inventory_usage`): every POS deduction, waste
  approval, and count variance writes per-event rows with cost, preserving
  product/group attribution. POS deductions and waste no longer clamp at
  on-hand — **stock can go negative** (shortfall costed at the item's
  `last_unit_cost_fils` fallback) and negative items raise alerts.
- Profit Reports (owner): full P&L for any month/date range — revenue per
  method + delivery platform from EOD, COGS by product/group/item from the
  ledger, complimentary cost shown as an "of which" inside COGS (never
  deducted twice), expenses by category, fees, losses, net profit.
- Losses (owner): period report of waste by item, count shrinkage by item,
  complimentary given away, and balance-adjustment shortages/overages.
- Money → Adjust Balances: owner enters the actually-counted register/bank
  amount; diff is logged (`balance_adjustments`) and posted as a
  `balance_adjustment` cash movement (affects P&L by default); history +
  drift report; deleting a check reverses its movement.
- Complimentary approvals snapshot recipe cost (`cost_fils`) for reporting.
- Inventory Insights (owner): 7/30-day consumption rates from the ledger,
  stock-out predictions, reorder suggestions in whole purchase units,
  fast-mover ranking.
- Waste detail page + owner void of approved waste (restores stock exactly
  from its ledger rows).

**Not yet built (placeholders only):**
- Mark Item Opened (worker quick action)
- AI Insights (owner page)
