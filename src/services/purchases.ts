import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Purchase,
  PurchaseItem,
  PurchaseWithSubmitter,
  ReviewStatus,
} from "@/types/inventory";
import type {
  PurchaseCreateInput,
  PurchaseApproveInput,
  PurchaseOrderCreateInput,
  PurchaseReceiveInput,
  WorkerPurchaseCreateInput,
} from "@/lib/validators/inventory";
import {
  insertPurchase,
  insertPurchaseItems,
  listPurchases,
  listPendingPurchases,
  getPurchase,
  getPurchaseItems,
  voidPurchase,
  approvePurchaseRecord,
  updatePurchaseItemCost,
  updatePurchaseItemReceived,
  updatePurchaseStatus,
} from "@/repositories/purchases";
import { getInventoryItem, adjustStock } from "@/repositories/inventory-items";
import { listInventoryItemsOps } from "@/repositories/worker-inventory";
import { getPurchaseItemsOps } from "@/repositories/worker-purchases";
import {
  insertCashMovement,
  deleteCashMovementsBySource,
} from "@/repositories/cash-movements";
import { purchaseToBaseQty, receiveStock } from "@/lib/calculations/costing";

const today = () => new Date().toISOString().split("T")[0];

export async function getAllPurchases(
  db: SupabaseClient,
): Promise<Purchase[]> {
  return listPurchases(db);
}

export async function getPurchaseWithItems(
  db: SupabaseClient,
  id: string,
): Promise<{ purchase: Purchase; items: PurchaseItem[] } | null> {
  const purchase = await getPurchase(db, id);
  if (!purchase) return null;
  const items = await getPurchaseItems(db, id);
  return { purchase, items };
}

/**
 * Add received stock to an item at a given value (weighted-average cost falls
 * out automatically).
 */
async function landStock(
  db: SupabaseClient,
  inventoryItemId: string,
  baseQty: number,
  valueFils: number,
): Promise<void> {
  const item = await getInventoryItem(db, inventoryItemId);
  if (!item) return;
  const next = receiveStock(
    { baseQty: item.stockBaseQty, valueFils: item.stockValueFils },
    baseQty,
    valueFils,
  );
  await adjustStock(db, item.id, next.baseQty, next.valueFils);
}

/** Post the register/bank cash-out for a purchase payment. */
async function postPurchasePayment(
  db: SupabaseClient,
  purchaseId: string,
  paidMethod: "cash" | "bank",
  amountFils: number,
  occurredOn: string,
  createdBy: string,
): Promise<void> {
  if (amountFils <= 0) return;
  await insertCashMovement(db, {
    direction: "out",
    reason: "Purchase payment",
    amountFils,
    method: paidMethod === "cash" ? "Cash" : "Bank transfer",
    occurredOn,
    affectsPl: false,
    account: paidMethod === "cash" ? "register" : "bank",
    sourceType: "purchase_payment",
    sourceId: purchaseId,
    createdBy,
  });
}

/**
 * Owner one-shot: order + receive + (optionally) pay, all at once. Creates an
 * 'approved' purchase, lands stock immediately, and — when paid — posts the
 * cash-out the moment the money leaves.
 *
 * When status is 'needs_review' it behaves as a plain submission (no stock).
 */
export async function recordPurchase(
  db: SupabaseClient,
  input: PurchaseCreateInput,
  createdBy: string,
  status: ReviewStatus = "approved",
): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
  const itemDetails = await Promise.all(
    input.items.map(async (line) => {
      const item = await getInventoryItem(db, line.inventoryItemId);
      if (!item) {
        throw new Error(`Inventory item ${line.inventoryItemId} not found`);
      }
      const baseQty = purchaseToBaseQty(
        line.purchaseQty,
        item.unitsPerPurchase,
        item.basePerStock,
      );
      const lineTotalFils = Math.round(line.purchaseQty * line.unitCostFils);
      return { item, baseQty, lineTotalFils, line };
    }),
  );

  const totalFils = itemDetails.reduce((sum, d) => sum + d.lineTotalFils, 0);
  const purchasedOn = input.purchasedOn ?? today();
  const paying = status === "approved" && input.isPaid && !!input.paidMethod;

  const purchase = await insertPurchase(db, {
    supplierId: input.supplierId ?? null,
    purchasedOn,
    isPaid: input.isPaid,
    paidMethod: paying ? input.paidMethod : null,
    paidOn: paying ? purchasedOn : null,
    dueDate: input.dueDate ?? null,
    totalFils,
    createdBy,
    status,
    receivedOn: status === "approved" ? purchasedOn : null,
  });

  const items = await insertPurchaseItems(
    db,
    itemDetails.map((d) => ({
      purchaseId: purchase.id,
      inventoryItemId: d.line.inventoryItemId,
      purchaseQty: d.line.purchaseQty,
      baseQty: d.baseQty,
      unitCostFils: d.line.unitCostFils,
      lineTotalFils: d.lineTotalFils,
      expiryDate: d.line.expiryDate ?? null,
    })),
  );

  if (status === "approved") {
    for (const d of itemDetails) {
      await landStock(db, d.item.id, d.baseQty, d.lineTotalFils);
    }
    if (paying && input.paidMethod) {
      await postPurchasePayment(
        db,
        purchase.id,
        input.paidMethod,
        totalFils,
        purchasedOn,
        createdBy,
      );
    }
  }

  return { purchase, items };
}

/**
 * Log an order (owner). No stock, no cash, no review gate — it becomes an
 * 'ordered' purchase everyone can see as incoming. Expected cost is optional.
 */
export async function orderPurchase(
  db: SupabaseClient,
  input: PurchaseOrderCreateInput,
  createdBy: string,
): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
  const itemDetails = await Promise.all(
    input.items.map(async (line) => {
      const item = await getInventoryItem(db, line.inventoryItemId);
      if (!item) {
        throw new Error(`Inventory item ${line.inventoryItemId} not found`);
      }
      const baseQty = purchaseToBaseQty(
        line.purchaseQty,
        item.unitsPerPurchase,
        item.basePerStock,
      );
      const lineTotalFils = Math.round(line.purchaseQty * line.unitCostFils);
      return { baseQty, lineTotalFils, line };
    }),
  );

  const totalFils = itemDetails.reduce((sum, d) => sum + d.lineTotalFils, 0);

  const purchase = await insertPurchase(db, {
    supplierId: input.supplierId ?? null,
    purchasedOn: input.purchasedOn ?? today(),
    isPaid: false,
    dueDate: null,
    totalFils,
    createdBy,
    status: "ordered",
  });

  const items = await insertPurchaseItems(
    db,
    itemDetails.map((d) => ({
      purchaseId: purchase.id,
      inventoryItemId: d.line.inventoryItemId,
      purchaseQty: d.line.purchaseQty,
      baseQty: d.baseQty,
      unitCostFils: d.line.unitCostFils,
      lineTotalFils: d.lineTotalFils,
      expiryDate: d.line.expiryDate ?? null,
    })),
  );

  return { purchase, items };
}

/**
 * Log an order (worker). Same 'ordered' state, but the item lookup uses the
 * cost-free operational view and no cost is ever recorded — the owner sets cost
 * when the goods are received and approved.
 */
export async function orderWorkerPurchase(
  db: SupabaseClient,
  input: PurchaseOrderCreateInput,
  createdBy: string,
): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
  const allItems = await listInventoryItemsOps(db);
  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  const itemDetails = input.items.map((line) => {
    const item = itemMap.get(line.inventoryItemId);
    if (!item) {
      throw new Error(`Inventory item ${line.inventoryItemId} not found`);
    }
    const baseQty = purchaseToBaseQty(
      line.purchaseQty,
      item.unitsPerPurchase,
      item.basePerStock,
    );
    return { baseQty, line };
  });

  const purchase = await insertPurchase(db, {
    supplierId: input.supplierId ?? null,
    purchasedOn: input.purchasedOn ?? today(),
    isPaid: false,
    dueDate: null,
    totalFils: 0,
    createdBy,
    status: "ordered",
  });

  const items = await insertPurchaseItems(
    db,
    itemDetails.map((d) => ({
      purchaseId: purchase.id,
      inventoryItemId: d.line.inventoryItemId,
      purchaseQty: d.line.purchaseQty,
      baseQty: d.baseQty,
      unitCostFils: 0,
      lineTotalFils: 0,
      expiryDate: d.line.expiryDate ?? null,
    })),
  );

  return { purchase, items };
}

/**
 * Owner receives an existing order (auto-approve): the actual quantity
 * overwrites the draft and stock lands immediately.
 *
 * If the order was already paid (prepay), the paid amount is final
 * (assume-equal): line value is kept, only the received quantity updates, and
 * no new payment is posted. Otherwise the owner-entered unit costs value the
 * stock and the purchase becomes a payable until paid.
 */
export async function receivePurchaseByOwner(
  db: SupabaseClient,
  purchaseId: string,
  input: PurchaseReceiveInput,
  _reviewedBy: string,
): Promise<void> {
  const existing = await getPurchaseWithItems(db, purchaseId);
  if (!existing) throw new Error("Purchase not found");
  if (existing.purchase.status !== "ordered") {
    throw new Error("Only an open order can be received");
  }
  const prepaid = existing.purchase.paidOn !== null;

  let totalFils = 0;
  for (const entry of input.items) {
    const pi = existing.items.find((i) => i.id === entry.purchaseItemId);
    if (!pi) throw new Error(`Purchase item ${entry.purchaseItemId} not found`);

    const item = await getInventoryItem(db, pi.inventoryItemId);
    if (!item) continue;
    const baseQty = purchaseToBaseQty(
      entry.purchaseQty,
      item.unitsPerPurchase,
      item.basePerStock,
    );

    if (prepaid) {
      // Value is locked to what was paid; only the quantity is actual.
      totalFils += pi.lineTotalFils;
      await updatePurchaseItemReceived(db, pi.id, {
        purchaseQty: entry.purchaseQty,
        baseQty,
        expiryDate: entry.expiryDate ?? pi.expiryDate,
      });
      await landStock(db, item.id, baseQty, pi.lineTotalFils);
    } else {
      const unitCostFils = entry.unitCostFils ?? pi.unitCostFils;
      const lineTotalFils = Math.round(entry.purchaseQty * unitCostFils);
      totalFils += lineTotalFils;
      await updatePurchaseItemReceived(db, pi.id, {
        purchaseQty: entry.purchaseQty,
        baseQty,
        unitCostFils,
        lineTotalFils,
        expiryDate: entry.expiryDate ?? pi.expiryDate,
      });
      await landStock(db, item.id, baseQty, lineTotalFils);
    }
  }

  await approvePurchaseRecord(db, purchaseId, totalFils, today());
}

/**
 * Worker receives an existing order: the actual quantity overwrites the draft
 * and the order moves to needs_review. No stock and no cash change — the owner
 * approves (and enters cost) exactly like any other worker receipt.
 */
export async function receivePurchaseByWorker(
  db: SupabaseClient,
  purchaseId: string,
  input: PurchaseReceiveInput,
  _receivedBy: string,
): Promise<void> {
  const lines = await getPurchaseItemsOps(db, purchaseId);
  if (lines.length === 0) throw new Error("Order not found");

  const allItems = await listInventoryItemsOps(db);
  const itemMap = new Map(allItems.map((i) => [i.id, i]));
  const lineMap = new Map(lines.map((l) => [l.id, l]));

  // Update quantities first, while the purchase is still 'ordered' (the RLS
  // policy that lets a worker edit the lines requires that), then flip status.
  for (const entry of input.items) {
    const line = lineMap.get(entry.purchaseItemId);
    if (!line) throw new Error(`Purchase item ${entry.purchaseItemId} not found`);
    const item = itemMap.get(line.inventoryItemId);
    if (!item) continue;
    const baseQty = purchaseToBaseQty(
      entry.purchaseQty,
      item.unitsPerPurchase,
      item.basePerStock,
    );
    if (item.expiry === "required" && !(entry.expiryDate ?? line.expiryDate)) {
      throw new Error(`${item.name} needs an expiry date.`);
    }
    await updatePurchaseItemReceived(db, line.id, {
      purchaseQty: entry.purchaseQty,
      baseQty,
      expiryDate: entry.expiryDate ?? line.expiryDate,
    });
  }

  await updatePurchaseStatus(db, purchaseId, "needs_review");
}

export async function getPendingPurchases(
  db: SupabaseClient,
): Promise<PurchaseWithSubmitter[]> {
  return listPendingPurchases(db);
}

/**
 * Owner approves a worker's received purchase: costs are set, stock lands, and
 * the receipt is marked approved. Payment is decoupled — approval never posts a
 * new payable. The one exception is a worker cash purchase (paid from the
 * register at submit): the drawer already moved, so we only reconcile that
 * register movement to the approved total if the owner corrected the cost.
 */
export async function approvePurchase(
  db: SupabaseClient,
  purchaseId: string,
  input: PurchaseApproveInput,
  reviewedBy: string,
): Promise<void> {
  const existing = await getPurchaseWithItems(db, purchaseId);
  if (!existing) throw new Error("Purchase not found");
  if (existing.purchase.status !== "needs_review") {
    throw new Error("Purchase is not pending review");
  }

  let totalFils = 0;

  for (const entry of input.items) {
    const pi = existing.items.find((i) => i.id === entry.purchaseItemId);
    if (!pi) throw new Error(`Purchase item ${entry.purchaseItemId} not found`);

    const lineTotalFils = Math.round(pi.purchaseQty * entry.unitCostFils);
    totalFils += lineTotalFils;

    await updatePurchaseItemCost(
      db,
      entry.purchaseItemId,
      entry.unitCostFils,
      lineTotalFils,
    );

    await landStock(db, pi.inventoryItemId, pi.baseQty, lineTotalFils);
  }

  await approvePurchaseRecord(db, purchaseId, totalFils, today());

  // Worker cash purchase: register cash left the drawer when the worker
  // recorded it. Keep the drawer truthful — repost the payment at the approved
  // total (a no-op if the owner didn't change the cost).
  if (existing.purchase.isPaid && existing.purchase.paidMethod === "cash") {
    await deleteCashMovementsBySource(db, "purchase_payment", purchaseId);
    await postPurchasePayment(
      db,
      purchaseId,
      "cash",
      totalFils,
      existing.purchase.paidOn ?? existing.purchase.purchasedOn,
      reviewedBy,
    );
  }
}

export async function rejectPurchase(
  db: SupabaseClient,
  purchaseId: string,
): Promise<void> {
  const existing = await getPurchase(db, purchaseId);
  if (!existing) throw new Error("Purchase not found");
  if (existing.status !== "needs_review") {
    throw new Error("Purchase is not pending review");
  }
  // Reverse any payment already posted (a worker cash purchase deducted the
  // register at submit); voiding keeps the audit record.
  await deleteCashMovementsBySource(db, "purchase_payment", purchaseId);
  await voidPurchase(db, purchaseId);
}

export async function cancelPurchase(
  db: SupabaseClient,
  id: string,
): Promise<void> {
  const purchaseData = await getPurchaseWithItems(db, id);
  if (!purchaseData) throw new Error("Purchase not found");

  // Only an approved purchase actually moved stock; reverse it if so.
  if (purchaseData.purchase.status === "approved") {
    for (const pi of purchaseData.items) {
      const item = await getInventoryItem(db, pi.inventoryItemId);
      if (!item) continue;
      await adjustStock(
        db,
        item.id,
        Math.max(0, item.stockBaseQty - pi.baseQty),
        Math.max(0, item.stockValueFils - pi.lineTotalFils),
      );
    }
  }

  await deleteCashMovementsBySource(db, "purchase_payment", id);
  await voidPurchase(db, id);
}

/**
 * Worker submission. Two shapes:
 *  - supplier_delivery: goods arrived; recorded as needs_review, unpaid. The
 *    owner enters cost and approves before stock lands.
 *  - cash_purchase: bought with till cash; recorded as needs_review AND paid.
 *    The register cash-out is posted immediately so the drawer stays truthful;
 *    the owner still reviews the purchase and the payment.
 * Uses the cost-free operational view for item lookups.
 */
export async function recordWorkerPurchase(
  db: SupabaseClient,
  input: WorkerPurchaseCreateInput,
  createdBy: string,
): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
  const allItems = await listInventoryItemsOps(db);
  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  const itemDetails = input.items.map((line) => {
    const item = itemMap.get(line.inventoryItemId);
    if (!item) {
      throw new Error(`Inventory item ${line.inventoryItemId} not found`);
    }
    if (item.expiry === "required" && !line.expiryDate) {
      throw new Error(`${item.name} needs an expiry date.`);
    }
    const baseQty = purchaseToBaseQty(
      line.purchaseQty,
      item.unitsPerPurchase,
      item.basePerStock,
    );
    const lineTotalFils = Math.round(line.purchaseQty * line.unitCostFils);
    return { item, baseQty, lineTotalFils, line };
  });

  const totalFils = itemDetails.reduce((sum, d) => sum + d.lineTotalFils, 0);
  const isCash = input.mode === "cash_purchase";
  const purchasedOn = input.purchasedOn ?? today();

  const purchase = await insertPurchase(db, {
    supplierId: input.supplierId ?? null,
    purchasedOn,
    isPaid: isCash,
    paidMethod: isCash ? "cash" : null,
    paidOn: isCash ? purchasedOn : null,
    dueDate: null,
    totalFils,
    createdBy,
    status: "needs_review",
  });

  const items = await insertPurchaseItems(
    db,
    itemDetails.map((d) => ({
      purchaseId: purchase.id,
      inventoryItemId: d.line.inventoryItemId,
      purchaseQty: d.line.purchaseQty,
      baseQty: d.baseQty,
      unitCostFils: d.line.unitCostFils,
      lineTotalFils: d.lineTotalFils,
      expiryDate: d.line.expiryDate ?? null,
    })),
  );

  // The till cash left the register now — post it immediately.
  if (isCash) {
    await postPurchasePayment(
      db,
      purchase.id,
      "cash",
      totalFils,
      purchasedOn,
      createdBy,
    );
  }

  return { purchase, items };
}
