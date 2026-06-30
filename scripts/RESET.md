# Resetting Rush OS to a clean start

This does two things:

1. **Wipes all business data** (blank slate) while keeping your existing
   accounts and your delivery platforms.
2. **Stops anyone from creating new accounts.**

## 1. Back up first (do not skip)

The data wipe is **irreversible**. In the Supabase Dashboard go to
**Database → Backups** and take/download a backup before continuing.

## 2. Wipe the data

Supabase Dashboard → **SQL Editor** → paste the entire contents of
[`scripts/reset-data.sql`](./reset-data.sql) → **Run**.

What is **kept**:

- Your user accounts (`auth.users` + `profiles`, roles unchanged).
- Your delivery platforms (Jahez / Talabat / Keeta / Beanz + commission rates).

What is **deleted** (everything else): suppliers, inventory items, products,
recipes, purchases, POS sales, complimentary logs, waste, daily closings,
cash / expenses / settlements / recurring costs, register cash-outs, and
inventory counts. All stock levels return to zero.

The script runs in one transaction and refuses to run if it finds no accounts
(a guard against pointing it at the wrong database).

### Uploaded files (receipts / POS images)

To also clear stored files: Supabase Dashboard → **Storage** → open each
bucket → select all → **Delete**. (The bottom of `reset-data.sql` has optional
SQL to remove the Storage metadata rows too.)

## 3. Lock new account creation

Code-side this is already done on this branch:

- The signup page and "Create account" link are removed; `/signup` now
  redirects to `/login`.
- `supabase/config.toml` sets `enable_signup = false`.

**On the hosted project you must also flip the dashboard toggle** (the hosted
project does not read `config.toml` automatically):

> Supabase Dashboard → **Authentication → Sign In / Providers → Email** →
> turn **Allow new users to sign up** **OFF** → Save.

After that, the only way to add an account is you, manually, from
**Authentication → Users** in the dashboard. To allow self-signup again later,
re-enable that toggle and restore the signup page.
