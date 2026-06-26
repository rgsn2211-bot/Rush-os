/** Delivery platform domain types. Commission stored as integer basis points. */

export interface DeliveryPlatform {
  id: string;
  name: string;
  /** Commission in basis points: 2500 = 25%. */
  commissionBps: number;
  /** Fixed fee charged per order, in fils. */
  fixedFeeFils: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Cost-free shape workers see (no commission/fee). */
export interface DeliveryPlatformLite {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}
