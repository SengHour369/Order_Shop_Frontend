import { CheckoutAttempt } from "./checkout-attempt";

describe("Checkout retry identity", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("creates a retry-safe checkout key on Wi-Fi HTTP without randomUUID", () => {
    vi.stubGlobal("crypto", {getRandomValues:crypto.getRandomValues.bind(crypto)});
    const store = new CheckoutAttempt();
    const body = store.begin(7, 12, "BAKONG", "USD");
    expect(body.checkout_key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(store.begin(7, 12, "BAKONG", "USD").checkout_key).toBe(body.checkout_key);
  });

  it("retains the same request after a timeout and page reload", () => {
    const original = new CheckoutAttempt().begin(7, 12, "BAKONG", "USD");
    const retry = new CheckoutAttempt().begin(7, 99, "COD", "KHR");
    expect(retry).toEqual(original);
    expect(retry.checkout_key).toBeTruthy();
  });

  it("isolates customers and clears a completed checkout", () => {
    const store = new CheckoutAttempt();
    const first = store.begin(7, 12, "BAKONG", "USD");
    const other = store.begin(8, 13, "COD", "USD");
    store.attachOrder(7,11);
    expect(new CheckoutAttempt().orderId(7)).toBe(11);
    store.clear(7);
    expect(store.orderId(7)).toBeNull();
    expect(store.read(7)).toBeNull();
    expect(store.read(8)).toEqual(other);
    expect(store.begin(7, 12, "BAKONG", "USD").checkout_key).not.toBe(
      first.checkout_key,
    );
  });

  it("rejects corrupt persisted checkout data", () => {
    sessionStorage.setItem("eshop.checkout.7", "{broken");
    expect(new CheckoutAttempt().read(7)).toBeNull();
    sessionStorage.setItem(
      "eshop.checkout.7",
      JSON.stringify({ checkout_key: "key", address_id: "wrong" }),
    );
    expect(new CheckoutAttempt().read(7)).toBeNull();
  });
});
