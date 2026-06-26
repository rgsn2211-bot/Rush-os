# Deploying Rush OS

A plain-English, step-by-step guide to putting Rush OS online. It assumes your
**Supabase cloud project already exists and is linked** (it is), and that you
have **no Vercel account yet**.

Two services run the app:

- **Supabase** — your database, logins, and file storage (already set up).
- **Vercel** — runs the Next.js app on the internet and re-deploys on every push.

You will not need a custom domain. Vercel gives you a free `something.vercel.app` URL.

---

## How it fits together

```
GitHub repo (main branch)  ──►  Vercel (runs the app)  ──►  Supabase (database + login)
```

Vercel watches the `main` branch. Every push to `main` triggers a new deploy.
The app talks to Supabase using three keys you paste into Vercel.

---

## Step 1 — Make sure the database schema is on Supabase cloud

On your own computer, from the project folder:

```bash
npm run db:push      # applies all migrations to the cloud database
npm run db:types     # regenerates src/types/database.ts from the live schema
```

If `db:push` says everything is already applied, you're good.

> The migrations create every table plus the 4 delivery platforms
> (Jahez, Talabat, Keeta, Beanz). They do **not** create your real products —
> you load those in Step 7.

---

## Step 2 — Create a Vercel account and import the repo

1. Go to <https://vercel.com> and **Sign up with GitHub** (easiest — it links your repos).
2. Click **Add New… → Project**.
3. Find the `rush-os` repository and click **Import**.
4. Vercel auto-detects **Next.js**. **Do not change** the build or output settings —
   the defaults are correct.
5. **Stop before clicking Deploy** — first add the environment variables (Step 3).

---

## Step 3 — Add the three environment variables

The app refuses to start without these (it validates them on boot in
`src/lib/env.ts`), and Vercel needs them **at build time**, so set them now.

Get the values from **Supabase Dashboard → Project Settings → API**:

| Vercel variable name             | Where to copy it from (Supabase) | Public?         |
| -------------------------------- | -------------------------------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Project URL                      | Public (safe)   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | `anon` `public` key              | Public (safe)   |
| `SUPABASE_SERVICE_ROLE_KEY`      | `service_role` `secret` key      | **SECRET**      |

In Vercel's import screen (or later under **Project → Settings → Environment
Variables**), add all three for the **Production** environment (and Preview, if you
want preview deploys to work too).

> ⚠️ The `service_role` key bypasses all security rules. Never put it in a
> `NEXT_PUBLIC_` variable, never paste it into client code, never commit it to git.

---

## Step 4 — Deploy

Click **Deploy**. The first build takes a couple of minutes. When it finishes,
Vercel shows your live URL, e.g. `https://rush-os-xxxx.vercel.app`. Copy it.

---

## Step 5 — Point Supabase Auth at your live URL

So logins and email links work on the real site:

1. **Supabase Dashboard → Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel URL (e.g. `https://rush-os-xxxx.vercel.app`).
3. Under **Redirect URLs**, add the same URL (and `https://rush-os-xxxx.vercel.app/**`).
4. Save.

> Email confirmation is **off** by default (see `supabase/config.toml`), so new
> accounts can sign in immediately. Turn it on later under **Authentication →
> Providers → Email** if you want confirmation emails.

---

## Step 6 — Create the first owner account

1. Open `https://rush-os-xxxx.vercel.app/signup` once and create your account.
   **The very first account is automatically made the owner** (database trigger
   `promote_first_user`). Everyone who signs up after that is a **worker**.
2. Log in. As owner you land on the owner dashboard; workers land on the worker app.
3. **Recommended:** once your owner account exists, disable open sign-ups so random
   people can't register — **Supabase Dashboard → Authentication → Providers →
   Email → disable "Allow new users to sign up"** (or "Confirm email" + invite-only).
   Create worker logins yourself via **Authentication → Users → Add user**.

---

## Step 7 — Load your real data (delete demo, seed real)

The migrations seeded **demo** coffee-shop data. To wipe everything and load your
real Rush data:

1. Open `supabase/seed-rush.sql` and edit **Section C** to your real suppliers,
   inventory items, products, and recipes. (It ships filled with the demo data as a
   worked example — replace those values. Money is in **fils**: 1.500 BHD → `1500`.)
2. **Supabase Dashboard → SQL Editor → New query**, paste the whole file, click **Run**.

The script runs in one transaction (all-or-nothing), keeps your `profiles` (logins),
re-seeds the delivery platforms, and is **safe to run again** — each run wipes and
re-seeds from scratch.

---

## Everyday after this

- Push to `main` → Vercel auto-deploys.
- Change the database schema only through new migration files in `supabase/migrations/`,
  then `npm run db:push`. Don't edit tables by hand in the dashboard (keeps the repo
  the source of truth).

---

## Troubleshooting

| Symptom                                        | Cause / fix                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Build fails with a Zod "Required" error        | An env var is missing in Vercel. Re-check all three in Step 3, then redeploy. |
| Login seems to loop or "redirect" errors       | Site URL / Redirect URLs don't match the Vercel URL — fix in Step 5.        |
| First user isn't an owner                       | A profile already existed. Check **Authentication → Users**; the trigger only promotes when no owner exists yet. |
| Delivery platforms missing after a data reset   | Re-run `supabase/seed-rush.sql` (its Section B re-creates them).            |
