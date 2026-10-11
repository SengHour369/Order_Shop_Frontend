import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { CheckoutPage } from "./checkout.page";
import { CheckoutAttempt } from "./checkout-attempt";
import { AuthService } from "../../core/auth/auth.service";
import { CartApi } from "../cart/cart.api";
import { AddressesApi } from "../addresses/addresses.api";
import { OrdersApi } from "../orders/orders.api";

describe("Pending checkout recovery", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("reads a locked cart and retries the original order without creating a new cart", () => {
    const attempt = new CheckoutAttempt();
    const original = attempt.begin(7, 9, "BAKONG", "USD");
    const current = vi.fn(() =>
      of({ items: [], total_items: 0, total_price: 0 }),
    );
    const load = vi.fn();
    const checkout = vi.fn(() => of({ id: 11, status: "CHECKOUT_PENDING" }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { userId: () => 7 } },
        { provide: CartApi, useValue: { current, load } },
        { provide: AddressesApi, useValue: { list: () => of([]) } },
        { provide: OrdersApi, useValue: { checkout } },
        { provide: CheckoutAttempt, useValue: attempt },
      ],
    });
    const page = TestBed.createComponent(CheckoutPage).componentInstance;
    expect(current).toHaveBeenCalledOnce();
    expect(load).not.toHaveBeenCalled();
    page.submit();
    expect(checkout).toHaveBeenCalledExactlyOnceWith(original);
    expect(page.locked()).toBe(true);
    expect(page.step).toBe(3);
    expect(attempt.read(7)).toEqual(original);
    expect(page.message()).toContain("pending");
  });

  it("requires a shipping address and lets the customer review without placing an order", () => {
    const checkout = vi.fn(() => of({ id: 11, status: "PENDING" }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { userId: () => 7 } },
        {
          provide: CartApi,
          useValue: {
            load: () =>
              of({
                items: [
                  { id: 1, product_sku_id: 2, quantity: 1, total_price: 10 },
                ],
                total_items: 1,
                total_price: 10,
              }),
          },
        },
        { provide: AddressesApi, useValue: { list: () => of([]) } },
        { provide: OrdersApi, useValue: { checkout } },
        CheckoutAttempt,
      ],
    });
    const page = TestBed.createComponent(CheckoutPage).componentInstance;
    page.next();
    expect(page.step).toBe(1);
    page.addressId = 9;
    page.submit();
    expect(checkout).not.toHaveBeenCalled();
    page.next();
    page.submit();
    expect(checkout).not.toHaveBeenCalled();
    page.next();
    expect(page.step).toBe(3);
    expect(checkout).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});
