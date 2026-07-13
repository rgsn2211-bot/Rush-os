-- ============================================================================
-- Rush OS — Add the third role: pos_manager
--
-- A POS Manager is a trusted (non-owner) account that owns the product/inventory
-- catalog and POS item mapping. This file ONLY adds the enum value.
--
-- It MUST stay a standalone migration: Postgres refuses to *use* an enum value
-- inside the same transaction that added it (error 55P04), and the Supabase CLI
-- wraps each migration file in one transaction. The next migration
-- (20260714_pos_manager_access.sql) references 'pos_manager' in policies.
-- ============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pos_manager';
