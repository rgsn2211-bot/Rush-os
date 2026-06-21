-- ============================================================================
-- Rush OS — Phase 1 core schema: suppliers, inventory, products, recipes,
-- purchases. Money is integer fils (BHD x 1000). Quantities are in each item's
-- base unit. Weighted-average cost is tracked as (stock_base_qty, stock_value_fils)
-- so the average never has to be stored rounded — it is value / quantity.
-- ============================================================================

-- ---------- Enums -----------------------------------------------------------

-- How an item handles expiry dates.
create type expiry_mode as enum ('required', 'optional', 'not_needed');

-- Who a person is. Drives Row Level Security.
create type user_role as enum ('owner', 'worker');

-- Lifecycle for anything a worker can submit. Voided keeps the audit record.
create type review_status as enum ('approved', 'needs_review', 'voided');

-- ---------- Helpers ---------------------------------------------------------

-- Keep updated_at fresh on every UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- People / roles --------------------------------------------------

-- One row per auth user, holding their role. Created when a user signs up
-- (the trigger below). RLS decisions read from here.
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         user_role not null default 'worker',
  display_name text,
  created_at   timestamptz not null default now()
);

-- True when the current request is made by an owner. Used in RLS policies.
-- SECURITY DEFINER so it can read profiles regardless of the caller's own access.
create or replace function is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- When a new auth user is created, give them a profile (default: worker).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Suppliers -------------------------------------------------------

create table suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  lead_time_days integer not null default 0 check (lead_time_days >= 0),
  notes          text,
  status         review_status not null default 'approved',
  created_by     uuid references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger suppliers_updated_at before update on suppliers
  for each row execute function set_updated_at();

-- ---------- Inventory items -------------------------------------------------
-- stock_base_qty : amount on hand, in the item's base unit (e.g. grams, litres, pc)
-- stock_value_fils : total value of that stock in fils. Weighted-average unit
--   cost = stock_value_fils / stock_base_qty (computed when needed, never stored
--   rounded). units_per_purchase converts a purchase unit into base units
--   (e.g. 1 case = 12 L  ->  units_per_purchase = 12, base_unit = 'L').

create table inventory_items (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  category           text,
  base_unit          text not null,                       -- 'g', 'L', 'pc', ...
  purchase_unit      text not null,                       -- 'case', 'kg', 'box', ...
  units_per_purchase numeric not null check (units_per_purchase > 0),
  expiry             expiry_mode not null default 'not_needed',
  tracks_open        boolean not null default false,      -- track life after opening
  shelf_life_days    integer check (shelf_life_days is null or shelf_life_days >= 0),
  open_life_days     integer check (open_life_days is null or open_life_days >= 0),
  min_base_qty       numeric not null default 0 check (min_base_qty >= 0),
  max_base_qty       numeric check (max_base_qty is null or max_base_qty >= 0),
  safety_days        integer not null default 0 check (safety_days >= 0),
  supplier_id        uuid references suppliers (id),
  stock_base_qty     numeric not null default 0,
  stock_value_fils   bigint  not null default 0,
  status             review_status not null default 'approved',
  created_by         uuid references auth.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger inventory_items_updated_at before update on inventory_items
  for each row execute function set_updated_at();

create index inventory_items_supplier_idx on inventory_items (supplier_id);
create index inventory_items_status_idx on inventory_items (status);

-- ---------- Products (sold items) and their recipes -------------------------
-- price_fils : selling price. pos_item_id : the stable POS "Id" column, the
-- primary key we map POS Sales-By-Item rows onto (see docs/pos/file-structure.md).

create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  price_fils  bigint not null default 0 check (price_fils >= 0),
  pos_item_id integer unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

-- A product's recipe = the inventory it consumes per unit sold, in base units.
create table recipe_ingredients (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products (id) on delete cascade,
  inventory_item_id uuid not null references inventory_items (id) on delete restrict,
  qty_base          numeric not null check (qty_base > 0),
  created_at        timestamptz not null default now(),
  unique (product_id, inventory_item_id)
);
create index recipe_ingredients_product_idx on recipe_ingredients (product_id);

-- ---------- Purchases (receiving stock) -------------------------------------
-- Receiving a purchase increases stock and its value (feeding weighted-average
-- cost). A purchase is NOT immediately COGS — it becomes COGS as stock is used.

create table purchases (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid references suppliers (id),
  purchased_on date not null default current_date,
  is_paid      boolean not null default false,
  due_date     date,
  total_fils   bigint not null default 0 check (total_fils >= 0),
  image_path   text,
  status       review_status not null default 'approved',
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger purchases_updated_at before update on purchases
  for each row execute function set_updated_at();

create table purchase_items (
  id                uuid primary key default gen_random_uuid(),
  purchase_id       uuid not null references purchases (id) on delete cascade,
  inventory_item_id uuid not null references inventory_items (id) on delete restrict,
  purchase_qty      numeric not null check (purchase_qty > 0),  -- in purchase units
  base_qty          numeric not null check (base_qty > 0),      -- converted to base units
  unit_cost_fils    bigint not null check (unit_cost_fils >= 0),-- per purchase unit
  line_total_fils   bigint not null check (line_total_fils >= 0),
  created_at        timestamptz not null default now()
);
create index purchase_items_purchase_idx on purchase_items (purchase_id);
create index purchase_items_item_idx on purchase_items (inventory_item_id);

-- ============================================================================
-- Row Level Security
-- Default-deny: enabling RLS with only owner policies means non-owners get
-- nothing until we explicitly grant worker access in the worker-auth phase.
-- That is the safe default. Worker-scoped policies (and a cost-free view for
-- operational screens) are added when worker login is built.
-- ============================================================================

alter table profiles            enable row level security;
alter table suppliers           enable row level security;
alter table inventory_items     enable row level security;
alter table products            enable row level security;
alter table recipe_ingredients  enable row level security;
alter table purchases           enable row level security;
alter table purchase_items      enable row level security;

-- A user can always read their own profile; owners can read all.
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_owner());

-- Owners have full access to everything in Phase 1.
create policy suppliers_owner_all on suppliers
  for all using (is_owner()) with check (is_owner());
create policy inventory_items_owner_all on inventory_items
  for all using (is_owner()) with check (is_owner());
create policy products_owner_all on products
  for all using (is_owner()) with check (is_owner());
create policy recipe_ingredients_owner_all on recipe_ingredients
  for all using (is_owner()) with check (is_owner());
create policy purchases_owner_all on purchases
  for all using (is_owner()) with check (is_owner());
create policy purchase_items_owner_all on purchase_items
  for all using (is_owner()) with check (is_owner());
