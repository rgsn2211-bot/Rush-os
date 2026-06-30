-- ============================================================================
-- Rush OS — FULL DATA RESET (blank slate)
--
-- WHAT THIS DOES
--   Deletes ALL business data so you can start fresh, while KEEPING:
--     * your user accounts        (auth.users + public.profiles, roles intact)
--     * your delivery platforms   (Jahez / Talabat / Keeta / Beanz + rates)
--
--   Everything else is wiped: catalog (suppliers, inventory items, products,
--   recipes) AND all history (purchases, POS sales, complimentary, waste,
--   daily closings, money / cash / expenses / settlements, inventory counts,
--   register cash-outs). All stock levels go to zero because the rows are gone.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   (The SQL Editor runs with full privileges and bypasses RLS, so TRUNCATE
--    works. The whole thing is one transaction: it all succeeds or none of it
--    does.)
--
-- THIS IS IRREVERSIBLE. Take a backup first:
--   Supabase Dashboard → Database → Backups (or download a dump) BEFORE running.
-- ============================================================================

BEGIN;

-- Safety guard: refuse to run if there are no accounts. This protects against
-- accidentally running the reset against the wrong / empty database.
DO $$
DECLARE
  account_count integer;
BEGIN
  SELECT count(*) INTO account_count FROM public.profiles;
  IF account_count = 0 THEN
    RAISE EXCEPTION
      'Aborting: no rows in public.profiles. This does not look like your live database (expected your existing accounts). No data was changed.';
  END IF;
  RAISE NOTICE 'Keeping % existing account(s).', account_count;
END $$;

-- Wipe every business-data table in one shot. RESTART IDENTITY resets any
-- auto-increment sequences; CASCADE clears foreign-key children together.
-- NOT listed here (intentionally kept): public.profiles, public.delivery_platforms.
TRUNCATE TABLE
  public.purchase_items,
  public.purchases,
  public.recipe_ingredients,
  public.products,
  public.inventory_items,
  public.suppliers,
  public.pos_sales_rows,
  public.pos_raw_rows,
  public.pos_item_catalog,
  public.pos_imports,
  public.complimentary_logs,
  public.waste_logs,
  public.daily_closing_delivery_lines,
  public.daily_closings,
  public.cash_movements,
  public.expense_lines,
  public.expenses,
  public.settlements,
  public.recurring_costs,
  public.register_cash_outs,
  public.inventory_count_items,
  public.inventory_counts
RESTART IDENTITY CASCADE;

-- Show what survived so you can eyeball it before committing.
DO $$
DECLARE
  acc integer;
  plat integer;
BEGIN
  SELECT count(*) INTO acc  FROM public.profiles;
  SELECT count(*) INTO plat FROM public.delivery_platforms;
  RAISE NOTICE 'Done. Accounts kept: %, delivery platforms kept: %.', acc, plat;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- OPTIONAL — clear uploaded files (receipt / POS images) from Storage.
--
-- The app stores receipt/POS image references in image_path / receipt_path.
-- The recommended way to clear the actual files is the Dashboard:
--   Storage → open each bucket → select all → Delete  (or "Empty bucket").
--
-- If you also want to remove the Storage metadata rows via SQL, uncomment and
-- adjust the bucket name(s) to match your project (Storage → Buckets):
--
--   DELETE FROM storage.objects WHERE bucket_id = 'receipts';
--   DELETE FROM storage.objects WHERE bucket_id = 'purchases';
--   DELETE FROM storage.objects WHERE bucket_id = 'pos';
-- ----------------------------------------------------------------------------
