import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { AdminApi } from "../api/admin.api";
import { AdminDashboardPage } from "./dashboard.page";

describe("Dashboard summaries", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AdminApi,
          useValue: {
            ordersSummary: () =>
              of({ totalOrders: 3, pending: 1, delivered: 2 }),
            inventorySummary: () =>
              of({
                total_products: 5,
                total_stock: 25,
                low_stock: 1,
                out_of_stock: 0,
              }),
            customerCount: () =>
              throwError(() => new Error("Service unavailable")),
            orders: () => of({ items: [{ id: 7, order_number: "ORD-7" }] }),
            monthlyReport: () =>
              of([
                { month: 1, count: 2, amount: 100, currency: "USD" },
                { month: 1, count: 1, amount: 400000, currency: "KHR" },
                { month: 2, count: 1, amount: 50, currency: "USD" },
              ]),
            weeklyOrders: () => of([]),
          },
        },
      ],
    });
  });
  it("preserves available summaries when one service fails", () => {
    const page = TestBed.createComponent(AdminDashboardPage).componentInstance;
    expect(page.orders()?.totalOrders).toBe(3);
    expect(page.inventory()?.total_stock).toBe(25);
    expect(page.recent().length).toBe(1);
    expect(page.customers()).toBeNull();
    expect(page.error()).toContain("Customers temporarily unavailable");
    expect(page.busy()).toBe(false);
  });
  it("does not combine currencies in the sales chart or total", () => {
    const page = TestBed.createComponent(AdminDashboardPage).componentInstance;
    expect(page.salesTotal()).toBe(150);
    page.currency = "KHR";
    expect(page.salesTotal()).toBe(400000);
    expect(page.salesMonths()[1].value).toBe(0);
  });
});
