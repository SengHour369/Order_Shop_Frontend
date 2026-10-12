import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { vi } from "vitest";
import { AdminApi } from "../api/admin.api";
import { InventoryReferencePage } from "./inventory-reference.page";

describe("stock workflow recovery", () => {
  it("retries only failed stock lines and preserves the warehouse threshold", () => {
    const api = {
      searchInventory: vi.fn(() => of({ items: [], pages: 1, total: 0 })),
      inventorySummary: vi.fn(() => of({})),
      inventoryItem: vi.fn((id: number) =>
        of({
          id,
          stock_qty: 50,
          reserved_qty: 5,
          warehouse_location: "Main",
          low_stock_threshold: 12,
        }),
      ),
      adjustInventory: vi
        .fn()
        .mockReturnValueOnce(of({ stock_qty: 45 }))
        .mockReturnValueOnce(throwError(() => new Error("Service unavailable")))
        .mockReturnValueOnce(of({ stock_qty: 45 })),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AdminApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(InventoryReferencePage);
    const page = fixture.componentInstance;
    page.action = "out";
    page.step = 3;
    page.lines = [1, 2].map((id) => ({
      row: { id, stock_qty: 50 },
      quantity: 5,
      before: 50,
      saved: false,
    }));
    page.confirm();
    expect(page.step).toBe(3);
    expect(page.lines[0].saved).toBe(true);
    expect(page.lines[1].saved).toBe(false);
    expect(page.error()).toContain("Service unavailable");
    page.confirm();
    expect(page.step).toBe(4);
    expect(api.adjustInventory.mock.calls).toEqual([
      [1, 45, "Main", 12],
      [2, 45, "Main", 12],
      [2, 45, "Main", 12],
    ]);
  });
});
