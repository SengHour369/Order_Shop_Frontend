import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { forkJoin } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { AddressesApi } from "../addresses/addresses.api";
import { CartApi } from "../cart/cart.api";
import { OrdersApi } from "../orders/orders.api";
import { Address, Cart } from "../../core/api/models";
import { CheckoutAttempt } from "./checkout-attempt";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, CurrencyPipe, FormsModule, RouterLink, Status],
  templateUrl: "./checkout.html",
})
export class CheckoutPage extends PageState {
  auth = inject(AuthService);
  addressApi = inject(AddressesApi);
  cartApi = inject(CartApi);
  orders = inject(OrdersApi);
  attempt = inject(CheckoutAttempt);
  router = inject(Router);
  addresses = signal<Address[]>([]);
  cart = signal<Cart | null>(null);
  locked = signal(false);
  step = 1;
  addressId = 0;
  method = "BAKONG";
  currency = "USD";
  constructor() {
    super();
    const previous = this.attempt.read(this.auth.userId());
    if (previous) {
      this.step = 3;
      this.locked.set(true);
      this.addressId = previous.address_id;
      this.method = previous.payment_method;
      this.currency = previous.currency;
    }
    this.run(
      forkJoin({
        addresses: this.addressApi.list(),
        // A pending checkout locks cart writes, including get-or-create.
        cart: previous ? this.cartApi.current() : this.cartApi.load(),
      }),
      (r) => {
        this.addresses.set(r.addresses);
        this.cart.set(r.cart);
        if (!previous)
          this.addressId =
            r.addresses.find((a) => a.is_default)?.id ||
            r.addresses[0]?.id ||
            0;
      },
    );
  }
  selectedAddress() {
    return this.addresses().find((a) => a.id === this.addressId);
  }
  next() {
    if (this.addressId && this.step < 3) this.step++;
  }
  submit() {
    if (this.step !== 3 || this.busy() || !this.addressId) return;
    const body = this.attempt.begin(
      this.auth.userId(),
      this.addressId,
      this.method,
      this.currency,
    );
    this.locked.set(true);
    this.run(this.orders.checkout(body), (o) => {
      if (o.status === "CHECKOUT_PENDING") {
        this.message.set(
          "Stock confirmation is still pending. Retry this checkout shortly.",
        );
        return;
      }
      this.attempt.clear(this.auth.userId());
      this.locked.set(false);
      void this.router.navigate(["/orders", o.id]);
    });
  }
}
