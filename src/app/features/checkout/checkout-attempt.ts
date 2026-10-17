import { Injectable } from "@angular/core";
import { Checkout } from "../../core/api/models";
@Injectable({ providedIn: "root" })
export class CheckoutAttempt {
  private key(userId: number) {
    return "eshop.checkout." + userId;
  }
  read(userId: number): Checkout | null {
    try {
      const raw = sessionStorage.getItem(this.key(userId));
      if (!raw) return null;
      const value = JSON.parse(raw);
      return typeof value.checkout_key === "string" &&
        Number.isSafeInteger(value.address_id) &&
        typeof value.payment_method === "string" &&
        typeof value.currency === "string"
        ? value
        : null;
    } catch {
      return null;
    }
  }
  begin(
    userId: number,
    address_id: number,
    payment_method: string,
    currency: string,
    review?: Pick<Checkout, "expected_total" | "reviewed_items">,
  ): Checkout {
    const previous = this.read(userId);
    if (previous) return previous;
    const body = {
      address_id,
      payment_method,
      currency,
      checkout_key: crypto.randomUUID(),
      ...review,
    };
    sessionStorage.setItem(this.key(userId), JSON.stringify(body));
    return body;
  }
  clear(userId: number) {
    sessionStorage.removeItem(this.key(userId));
  }
}
