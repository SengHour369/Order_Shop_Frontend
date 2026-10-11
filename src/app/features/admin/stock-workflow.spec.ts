import { describe, expect, it } from "vitest";
import { StockLine, stockAfter, validateStockLine } from "./stock-workflow";

const line = (quantity: number): StockLine => ({
  row: { id: 1, stock_qty: 50, reserved_qty: 5 },
  before: 50,
  quantity,
  saved: false,
});

describe("stock movement validation", () => {
  it("calculates incoming, outgoing and signed adjustment quantities", () => {
    expect(stockAfter("in", 50, 10)).toBe(60);
    expect(stockAfter("out", 50, 10)).toBe(40);
    expect(stockAfter("adjust", 50, -5)).toBe(45);
  });

  it("prevents deductions of reserved stock", () => {
    expect(validateStockLine("out", line(46))).toContain("reserved");
    expect(validateStockLine("out", line(45))).toBe("");
  });

  it("rejects fractional, zero and negative incoming quantities", () => {
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      expect(validateStockLine("in", line(quantity))).not.toBe("");
    }
    expect(validateStockLine("adjust", line(-5))).toBe("");
  });

  it("requires review again when stock changed before a deduction", () => {
    expect(validateStockLine("out", line(5), { stock_qty: 55 })).toContain(
      "Stock changed",
    );
    expect(validateStockLine("in", line(5), { stock_qty: 55 })).toBe("");
  });
});
