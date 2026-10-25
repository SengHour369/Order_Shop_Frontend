import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { PaymentsPage } from "./payments.page";
import { PaymentsApi } from "./payments.api";
import { OrdersApi } from "../orders/orders.api";
import { AuthService } from "../../core/auth/auth.service";

describe("Order payment creation", () => {
  function setup(status = "PENDING") {
    const transactions: unknown[] = [];
    const byOrder = vi.fn(() => of(transactions));
    const create = vi.fn(() => of({ id: 25, order_id: 11, status: "PENDING" }));
    TestBed.configureTestingModule({
      providers: [provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ order: "11" }) },
          },
        },
        { provide: AuthService, useValue: { session: () => ({ id: 7 }) } },
        {
          provide: OrdersApi,
          useValue: {
            detail: () =>
              of({
                id: 11,
                order_number: "ORDER-11",
                status,
                total_amount: 125,
              }),
          },
        },
        { provide: PaymentsApi, useValue: { byOrder, create } },
      ],
    });
    const fixture = TestBed.createComponent(PaymentsPage);
    return { page: fixture.componentInstance, create, byOrder, fixture };
  }

  it("creates one pending record with the server order total and blocks duplicates", () => {
    const { page, create, fixture } = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      "Create payment record",
    );
    page.paymentMethod = "ABA";
    page.createPayment();
    page.createPayment();
    expect(create).toHaveBeenCalledExactlyOnceWith(11, 125, "ABA", "USD");
    expect(page.transactions()[0].status).toBe("PENDING");
    expect(page.message()).toContain("confirmation is still required");
    expect(page.canCreatePayment()).toBe(false);
  });

  it("does not create payments while stock confirmation is pending", () => {
    const { page, create } = setup("CHECKOUT_PENDING");
    page.createPayment();
    expect(create).not.toHaveBeenCalled();
  });

  it("requires history reconciliation after a timeout before another creation", () => {
    const { page, create, byOrder } = setup();
    create.mockImplementationOnce(() => throwError(() => ({ status: 0 })));
    page.createPayment();
    page.createPayment();
    expect(create).toHaveBeenCalledOnce();
    expect(page.creationUncertain()).toBe(true);
    page.load();
    expect(byOrder).toHaveBeenCalledTimes(2);
    expect(page.creationUncertain()).toBe(false);
  });
  it("clears stale selected records on refresh and preserves non-success states", () => {
    const {page}=setup();
    const transaction={id:25,transaction_no:'TX-25',order_id:11,amount:125,currency:'USD',payment_method:'BAKONG',status:'REFUNDED'};
    page.selectedTransaction.set(transaction);
    expect(page.transactionTone(transaction)).toBe('');
    expect(page.transactionTone({...transaction,status:'PENDING'})).toBe('pending');
    expect(page.transactionTone({...transaction,status:'PAID'})).toBe('paid');
    page.load();expect(page.selectedTransaction()).toBeNull();
  });

});
