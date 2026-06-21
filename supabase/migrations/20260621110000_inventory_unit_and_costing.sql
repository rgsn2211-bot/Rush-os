-- Add stock_unit (display unit like kg, L), base_per_stock (conversion to base),
-- default_cost_fils (fallback when no avg exists), and costing_method.

alter table inventory_items
  add column stock_unit text,
  add column base_per_stock numeric not null default 1 check (base_per_stock > 0),
  add column default_cost_fils bigint not null default 0 check (default_cost_fils >= 0),
  add column costing_method text not null default 'weighted_average'
    check (costing_method in ('weighted_average', 'fixed'));

-- Backfill stock_unit from base_unit for any existing rows.
update inventory_items set stock_unit = base_unit where stock_unit is null;
alter table inventory_items alter column stock_unit set not null;
