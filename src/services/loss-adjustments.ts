import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryUsage, UsageClass } from "@/types/inventory";
import type { ReclassifyUsageInput } from "@/lib/validators/reports";
import {
  getUsageRow,
  updateUsageRow,
  insertUsageRow,
  deleteUsageRow,
} from "@/repositories/inventory-usage";

/** Classes a "not a real loss" adjustment can move a row to. */
const RECLASSIFIABLE_TO: UsageClass[] = ["used", "sold"];

/**
 * The class a row would have if it had never been adjusted — derived from what
 * produced it, exactly as the migration backfill does.
 */
export function defaultUsageClass(row: InventoryUsage): UsageClass {
  if (row.sourceType === "pos_import") return "sold";
  if (row.sourceType === "waste") return "wasted";
  return row.cogsFils >= 0 ? "shrinkage" : "overage";
}

/**
 * Move a loss out of the loss buckets because it was not really a loss.
 *
 * Napkins and cleaning supplies are in no product recipe, so the POS never
 * deducts them and their ordinary consumption lands in count shrinkage; a
 * drink whose POS button was never mapped shows up the same way. Marking those
 * `used` or `sold` stops them inflating Losses while keeping them in COGS.
 *
 * This is a REPORTING move only. The stock genuinely left the shelf, so:
 *   - inventory is never touched,
 *   - `occurredOn` never changes (the consumption still happened that day),
 *   - net profit is unaffected — only the split between "loss" and
 *     "operational usage" moves.
 *
 * Passing a `qtyBase` smaller than the row's splits it: the moved portion
 * becomes its own row pointing back at the parent, and the cost is apportioned
 * so the two rows sum EXACTLY to the original (the parent keeps the rounding
 * remainder).
 */
export async function reclassifyUsage(
  db: SupabaseClient,
  input: ReclassifyUsageInput,
  reclassifiedBy: string,
): Promise<void> {
  const row = await getUsageRow(db, input.usageId);
  if (!row) throw new Error("Usage record not found");

  if (row.usageClass !== "wasted" && row.usageClass !== "shrinkage") {
    throw new Error("Only waste and count shrinkage can be adjusted");
  }
  if (!RECLASSIFIABLE_TO.includes(input.toClass)) {
    throw new Error("Adjust a loss to 'used' or 'sold'");
  }

  const rowQty = Math.abs(row.qtyBase);
  const movedQty = input.qtyBase ?? rowQty;

  if (movedQty <= 0) throw new Error("Quantity must be greater than 0");
  if (movedQty > rowQty) {
    throw new Error("Quantity is more than this record covers");
  }

  const note = input.note ?? null;

  // Whole row: flip it in place.
  if (movedQty === rowQty) {
    await updateUsageRow(db, row.id, {
      usageClass: input.toClass,
      reclassNote: note,
      reclassifiedBy,
      reclassifiedAt: new Date().toISOString(),
    });
    return;
  }

  // Partial: split off the adjusted portion, apportioning cost by quantity.
  // The parent absorbs the rounding remainder so the pair always sums to the
  // original — the same discipline the POS COGS allocation uses.
  const movedCogsFils = Math.round((row.cogsFils * movedQty) / rowQty);
  const sign = row.qtyBase < 0 ? -1 : 1;

  await updateUsageRow(db, row.id, {
    qtyBase: row.qtyBase - sign * movedQty,
    cogsFils: row.cogsFils - movedCogsFils,
  });

  await insertUsageRow(db, {
    occurredOn: row.occurredOn,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    inventoryItemId: row.inventoryItemId,
    productId: row.productId,
    productGroupId: row.productGroupId,
    productGroupName: row.productGroupName,
    qtyBase: sign * movedQty,
    cogsFils: movedCogsFils,
    usageClass: input.toClass,
    reclassifiedFromId: row.id,
    reclassNote: note,
    reclassifiedBy,
  });
}

/**
 * Undo an adjustment — the escape hatch for a mis-click or a wrong call.
 *
 * A row that was split off its parent is merged back into it (quantity and
 * cost returned, child deleted) so the ledger returns to exactly its
 * pre-adjustment shape. A row adjusted in place simply reverts to the class
 * its source implies.
 */
export async function revertReclassification(
  db: SupabaseClient,
  usageId: string,
): Promise<void> {
  const row = await getUsageRow(db, usageId);
  if (!row) throw new Error("Usage record not found");

  const original = defaultUsageClass(row);
  if (row.usageClass === original && !row.reclassifiedFromId) {
    throw new Error("This record has not been adjusted");
  }

  if (row.reclassifiedFromId) {
    const parent = await getUsageRow(db, row.reclassifiedFromId);
    if (parent) {
      await updateUsageRow(db, parent.id, {
        qtyBase: parent.qtyBase + row.qtyBase,
        cogsFils: parent.cogsFils + row.cogsFils,
      });
      await deleteUsageRow(db, row.id);
      return;
    }
    // Parent is gone (its source was voided): fall through and just restore
    // the class on this row rather than losing the record.
  }

  await updateUsageRow(db, row.id, {
    usageClass: original,
    reclassNote: null,
    reclassifiedBy: null,
    reclassifiedAt: null,
    reclassifiedFromId: null,
  });
}
