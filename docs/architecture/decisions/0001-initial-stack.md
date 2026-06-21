# ADR 0001 — Initial stack and architecture for Rush OS

- Status: **Proposed (awaiting owner approval)**
- Date: 2026-06-21

## Context

Rush OS is an internal web app for a small specialty coffee shop: a worker tablet
app and an owner dashboard (desktop/tablet/phone). It manages inventory, recipes,
costing, POS imports, daily closing, money/settlements, and later forecasting and
AI. The build must be understandable by a student-level developer, AI-friendly,
testable, secure, relational, auditable, and cheap to run. GitHub is the source of
truth. The owner is new to this stack and wants to understand each part.

## Decision

**Version-one stack (two external services):**

- **Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui** — UI and API in one codebase.
- **Supabase** — PostgreSQL database, Auth, and file Storage in one service.
- **Vercel** — hosting and CI/CD from GitHub. Free `*.vercel.app` URL (no custom domain yet).
- **Zod** — input validation shared by client and server.
- **Vitest** — unit/integration tests.
- **XLSX parsing** runs server-side in Next.js route handlers.
- **Scheduled jobs** (alerts/reports) run via Vercel Cron when needed.

**Architecture:** layered (routes -> validators -> services -> repositories).
Business logic lives in `services/` and `lib/calculations/`, never in UI or routes.
Money stored as integer **fils** (BHD x 1000) to avoid float errors. Permissions
enforced at the database via Row Level Security and re-checked in services.

**Auth model:** Supabase Auth with two roles. Owner logs in with username/password
(full access). The shared worker tablet stays signed in as a worker-role device;
each worker enters a short PIN to attribute actions. Workers can never query
financial tables (enforced by RLS).

## Explicitly NOT used in v1 (and why)

- **MongoDB** — the domain is relational; Postgres is correct.
- **Clerk** — Supabase Auth already covers 2 roles / few users.
- **Cloudflare R2** — Supabase Storage already covers file uploads.
- **DigitalOcean** — no long-running servers needed yet.
- **Resend** — no email features until later phases.
- **Anthropic / Gemini / WhatsApp** — Phase 7, behind a provider abstraction.

## Consequences

- Smallest standard stack: only Supabase + Vercel accounts to manage.
- Low cost: ~$0/month in development; ~$45/month for early production.
- Portable: standard SQL migrations in-repo; only `repositories/` + `lib/supabase/`
  are Supabase-specific, so migrating away is contained.
- Trade-off: serverless function limits on Vercel may matter for very large POS
  files later — mitigated by streaming parse and daily (small) exports.

## Status / next step

This ADR is a **proposal**. It is finalized only after the owner approves. Changing
any locked choice later requires a new ADR that supersedes this one.
