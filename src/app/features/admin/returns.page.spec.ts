import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { of } from "rxjs";
import { AdminApi } from "./admin.api";
import { ReturnsPage } from "./returns.page";

describe("Returns reference integration", () => {
  it("sends named backend filters instead of unsupported criteria fields", () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AdminApi)
      .returns(2, "APPROVED", 10, {
        order_no: "ORD-1",
        from_date: "2026-10-01",
        to_date: "2026-10-07",
      })
      .subscribe();
    const request = http.expectOne("/api/v1/returns/returns");
    expect(request.request.body).toEqual({
      page: 2,
      size: 10,
      status: "APPROVED",
      order_no: "ORD-1",
      from_date: "2026-10-01T00:00:00",
      to_date: "2026-10-07T23:59:59.999",
    });
    request.flush({
      code: "200",
      data: { content: [], totalElements: 0, totalPages: 0 },
    });
    http.verify();
  });
  it("uses the catalog product ID for returns and rejects amounts above the order line total", () => {
    const create = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminApi,
          useValue: {
            returns: () => of({ items: [], total: 0, pages: 1 }),
            returnSummary: () => of({}),
            createReturn: create,
          },
        },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new ReturnsPage());
    page.found.set({ id: 10, customer_id: 2 });
    page.lines.set([{ product_sku_id: 42, product_id: 7, total_price: 120 }]);
    page.lineIndex = 0;
    page.applyLine();
    expect(page.productId).toBe(7);
    page.reason = "Defective";
    page.amount = 121;
    page.submitReturn();
    expect(create).not.toHaveBeenCalled();
    page.amount = 120;
    page.submitReturn();
    expect(create).toHaveBeenCalledWith({
      order_id: 10,
      customer_id: 2,
      product_id: 7,
      return_type: "REFUND",
      reason: "Defective",
      amount: 120,
    });
  });
});
