import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { AdminApi } from "../api/admin.api";
import {
  RefundDetailPage,
  RefundsPage,
  refundStage,
  refundTone,
} from "./refunds.page";

function setup(status = "PENDING") {
  const refund = {
    refund_id: "REF-1",
    order_no: "ORD-1",
    customer_id: 1,
    amount: 59,
    status,
  };
  const api = {
    returnsForOrder: () => of({ items: [], total: 0, pages: 1 }),
    refunds: vi.fn(() => of({ items: [refund], total: 1, pages: 1 })),
    refundSummary: () =>
      of({ total_refunds: 1, pending_refunds: 1, completed_refunds: 0 }),
    refundDetail: vi.fn(() => of(refund)),
    refundHistory: vi.fn(() => of([])),
    orderByNumber: () => of({ id: 1 }),
    customer: () =>
      of({ id: 1, username: "Customer", email: "test@example.test" }),
    paymentByOrder: () => of({ paymentMethod: "ABA", status: "PAID" }),
    orderItems: () => of([]),
    refundAction: vi.fn(() => of({ ...refund, status: "PROCESSED" })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AdminApi, useValue: api },
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap({ id: "REF-1" })),
          queryParamMap: of(convertToParamMap({})),
        },
      },
    ],
  });
  return api;
}
describe("Refund flow", () => {
  it("uses an explicit refund criterion even when the identifier has no prefix", () => {
    const api = setup();
    const page = TestBed.runInInjectionContext(() => new RefundsPage());
    page.changeCriteria(1); page.query = "12345"; page.apply();
    expect(api.refunds).toHaveBeenLastCalledWith(1, "", 10, 1, "12345");
    expect(page.visibleRows()).toHaveLength(1);
    page.changeCriteria(5); page.from = "2026-10-01"; page.to = "2026-10-11"; page.apply();
    expect(api.refunds).toHaveBeenLastCalledWith(1, "", 10, 5, "2026-10-01T00:00:00,2026-10-11T23:59:59");
  });
  it("distinguishes approval from completed processing", () => {
    expect(refundStage({ status: "APPROVED" })).toBe(2);
    expect(refundStage({ status: "PROCESSING" })).toBe(3);
    expect(refundStage({ status: "PROCESSED" })).toBe(4);
    expect(refundTone({ status: "CANCELLED" })).toBe("failed");
  });
  it("prevents actions on processed refunds", () => {
    const api = setup("PROCESSED");
    const page = TestBed.runInInjectionContext(() => new RefundDetailPage());
    page.action = "process";
    page.submit();
    expect(page.canAct()).toBe(false);
    expect(api.refundAction).not.toHaveBeenCalled();
  });
  it("sends the remark and reloads history after a pending refund action", () => {
    const api = setup();
    api.refundAction.mockImplementation(() => {
      api.refundDetail.mockReturnValue(
        of({
          refund_id: "REF-1",
          order_no: "ORD-1",
          customer_id: 1,
          amount: 59,
          status: "PROCESSED",
        }),
      );
      return of({
        refund_id: "REF-1",
        order_no: "ORD-1",
        customer_id: 1,
        amount: 59,
        status: "PROCESSED",
      });
    });
    const page = TestBed.runInInjectionContext(() => new RefundDetailPage());
    page.action = "process";
    page.remark = "  Checked return  ";
    page.submit();
    expect(api.refundAction).toHaveBeenCalledWith(
      "REF-1",
      "process",
      "Checked return",
    );
    expect(api.refundHistory).toHaveBeenCalledTimes(2);
    expect(page.canAct()).toBe(false);
  });
  it("sends order searches to the backend and enriches customer/payment cells", () => {
    const api = setup();
    const page = TestBed.runInInjectionContext(() => new RefundsPage());
    page.query = "ORD-1";
    page.apply();
    expect(api.refunds).toHaveBeenLastCalledWith(1, "", 10, 2, "ORD-1");
    expect(page.customerName(page.rows()[0])).toBe("Customer");
    expect(page.paymentMethod(page.rows()[0])).toBe("ABA");
    page.method = "Visa";
    expect(page.visibleRows()).toHaveLength(0);
  });
});
