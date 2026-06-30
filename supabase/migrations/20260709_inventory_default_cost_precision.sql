-- ============================================================================
-- inventory_items.default_cost_fils — widen bigint -> numeric for sub-fil rates
--
-- default_cost_fils is a per-BASE-UNIT cost RATE (cost of one ml / g / pc),
-- not a money amount. For cheap liquids and powders that rate is a fraction of
-- a fil — e.g. milk at 0.00054 BHD/ml = 0.54 fils/ml — which a bigint cannot
-- store (it was rounding to 0 or 1, and the form's step=0.001 blocked entry
-- entirely). Numeric lets the rate keep sub-fil precision.
--
-- This does NOT loosen the project's money rule: money AMOUNTS (stock_value_fils,
-- line totals, COGS) remain integer fils. Only this unit rate is fractional —
-- exactly like the derived weighted-average cost, which the costing layer
-- already treats as fractional and rounds only at the end of a calculation.
-- ============================================================================

alter table inventory_items
  alter column default_cost_fils type numeric using default_cost_fils::numeric;

-- The >= 0 check and the default of 0 carry over unchanged.
