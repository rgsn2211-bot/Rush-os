-- Phase 3: POS import pipeline + complimentary logging
-- Creates tables for XLSX import audit trail, POS item catalog, and worker comp logs.

-- ============================================================
-- POS import batch metadata
-- ============================================================
CREATE TABLE pos_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL DEFAULT 'sales_by_item',
  branch text NOT NULL,
  report_date date NOT NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed', 'voided')),
  row_count integer,
  error_summary text,
  inventory_deducted boolean NOT NULL DEFAULT false,
  deduction_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pos_imports_date_branch_uniq
  ON pos_imports (report_type, branch, report_date)
  WHERE status != 'voided';

CREATE UNIQUE INDEX pos_imports_hash_uniq
  ON pos_imports (file_hash)
  WHERE status != 'voided';

-- ============================================================
-- POS raw rows — immutable audit trail
-- ============================================================
CREATE TABLE pos_raw_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES pos_imports(id) ON DELETE CASCADE,
  sheet text NOT NULL,
  row_number integer NOT NULL,
  raw_cells jsonb NOT NULL,
  UNIQUE (import_id, row_number)
);

-- ============================================================
-- POS item catalog — all known POS items, mapped or not
-- ============================================================
CREATE TABLE pos_item_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_item_id integer UNIQUE NOT NULL,
  pos_item_name text NOT NULL,
  pos_category text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ignore boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- POS sales rows — validated/normalized from XLSX
-- ============================================================
CREATE TABLE pos_sales_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES pos_imports(id) ON DELETE CASCADE,
  raw_row_id uuid REFERENCES pos_raw_rows(id),
  pos_item_id integer NOT NULL,
  pos_item_name text NOT NULL,
  category text,
  qty_sold numeric NOT NULL CHECK (qty_sold >= 0),
  amount_fils bigint NOT NULL CHECK (amount_fils >= 0),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unmapped'
    CHECK (status IN ('mapped', 'unmapped', 'needs_review', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Complimentary logs — worker-submitted, owner-reviewed
-- ============================================================
CREATE TABLE complimentary_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount_fils bigint NOT NULL CHECK (amount_fils >= 0),
  reason text NOT NULL,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  status review_status NOT NULL DEFAULT 'needs_review',
  created_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS policies
-- ============================================================

-- POS tables: owner-only
ALTER TABLE pos_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_raw_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_item_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE complimentary_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pos_imports_owner_all ON pos_imports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY pos_raw_rows_owner_all ON pos_raw_rows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY pos_item_catalog_owner_all ON pos_item_catalog
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY pos_sales_rows_owner_all ON pos_sales_rows
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Complimentary: owner full access
CREATE POLICY complimentary_owner_all ON complimentary_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Complimentary: workers can insert their own with needs_review
CREATE POLICY complimentary_worker_insert ON complimentary_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND status = 'needs_review'
    AND created_by = auth.uid()
  );

-- Complimentary: workers can read their own
CREATE POLICY complimentary_worker_select ON complimentary_logs
  FOR SELECT USING (created_by = auth.uid());
