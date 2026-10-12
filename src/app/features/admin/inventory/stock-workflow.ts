import { Row, field } from "../api/admin.api";

export type StockAction = "in" | "out" | "adjust";

export interface StockLine {
  row: Row;
  quantity: number;
  before: number;
  after?: number;
  saved: boolean;
}

export function stockQuantity(row: Row): number {
  return Number(field(row, "stock_qty", "quantity")) || 0;
}

export function stockAfter(
  action: StockAction,
  before: number,
  quantity: number,
): number {
  return action === "out" ? before - quantity : before + quantity;
}

export function validateStockLine(
  action: StockAction,
  line: StockLine,
  current = line.row,
): string {
  if (
    !Number.isSafeInteger(line.quantity) ||
    line.quantity === 0 ||
    (action !== "adjust" && line.quantity < 0)
  ) {
    return "Enter a whole, non-zero quantity for every selected product.";
  }
  const before = stockQuantity(current);
  const after = stockAfter(action, before, line.quantity);
  const reserved =
    Number(field(current, "reserved_qty", "reserved_quantity")) || 0;
  if (!Number.isSafeInteger(after) || after < 0 || after < reserved) {
    return "The change would reduce stock below zero or reserved stock.";
  }
  if (action !== "in" && before !== line.before) {
    return "Stock changed since review. Go back to products and refresh before confirming.";
  }
  return "";
}
