import { Sku } from '../../core/api/models';

/** Available units exclude stock held by pending orders. Zero must not fall back to total stock. */
export function availableStock(sku?: Sku): number {
  const quantity = sku?.inventory?.available_qty ?? sku?.quantity ?? 0;
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
}

export function originalPrice(sku?: Sku): number {
  return sku?.originalPrice ?? sku?.promotion?.originalPrice ?? sku?.price ?? 0;
}

export function sellingPrice(sku?: Sku): number {
  return sku?.finalPrice ?? sku?.promotion?.finalPrice ?? sku?.price ?? 0;
}

export function hasDiscount(sku?: Sku): boolean {
  return originalPrice(sku) > sellingPrice(sku);
}

export function discountPercent(sku?: Sku): number {
  const original = originalPrice(sku);
  return original > 0 ? Math.max(0, Math.round((1 - sellingPrice(sku) / original) * 100)) : 0;
}

export function promotionName(sku?: Sku): string {
  return sku?.promotion?.promotionApplied ? sku.promotion.promotionName || '' : '';
}
