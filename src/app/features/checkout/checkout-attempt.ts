import { Injectable } from "@angular/core";
import { conversationId } from "../../shared/utils/conversation-id";
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
      checkout_key: conversationId(),
      ...review,
    };
    sessionStorage.setItem(this.key(userId), JSON.stringify(body));
    return body;
  }
  orderId(userId:number):number|null {
    try { const id=Number(sessionStorage.getItem(this.key(userId)+'.order'));return Number.isSafeInteger(id)&&id>0?id:null; } catch { return null; }
  }
  attachOrder(userId:number,id:number) {
    sessionStorage.setItem(this.key(userId)+'.order',String(id));
  }
  clear(userId: number) {
    sessionStorage.removeItem(this.key(userId)+'.order');
    sessionStorage.removeItem(this.key(userId));
  }
}
