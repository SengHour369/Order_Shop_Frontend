import { Component, computed, input, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { Product, Sku } from "../core/api/models";
import { AuthService } from "../core/auth/auth.service";
import { CustomerStore } from "../core/state/customer.store";
import { CartApi } from "../features/cart/cart.api";
import { Icon } from "./icon";
@Component({
  selector: "app-product-card",
  imports: [RouterLink, CurrencyPipe, Icon],
  template: `<article class="product-card">
    <div class="product-image">
      <a [routerLink]="['/shop', product().id]" [attr.aria-label]="product().name">
        @if (product().main_image.length) {
          <img
            [src]="product().main_image[0]"
            [alt]="product().name"
            loading="lazy"
            (error)="imageFailed.set(true)"
            [hidden]="imageFailed()"
          />
        }
        @if (!product().main_image.length || imageFailed()) {
          <app-icon name="bag" />
        }</a
      ><button
        class="wish-button"
        [class.saved]="store.has(product().id)"
        [attr.aria-label]="
          store.has(product().id) ? 'Remove from wishlist' : 'Add to wishlist'
        "
        (click)="save()"
      >
        <app-icon name="heart" />
      </button>
      @if (discount() > 0) {
        <span class="discount">{{ discount() }}% OFF</span>
      }
    </div>
    <a [routerLink]="['/shop', product().id]"
      ><h3>{{ product().name }}</h3></a
    >
    <p class="product-option">
      {{ sku()?.sku || "View available options" }}
    </p>
    <div class="product-price">
      @if (sku(); as s) {
        <strong>{{ s.finalPrice ?? s.price | currency: "USD" }}</strong>
        @if (s.finalPrice !== undefined && s.finalPrice < s.price) {
          <del>{{ s.price | currency: "USD" }}</del>
        }
      }
    </div>
    <button
      class="primary compact"
      [disabled]="
        busy() || !product().is_active || !sku() || (sku()?.quantity ?? 0) < 1
      "
      (click)="add()"
    >
      <app-icon name="cart" />{{ busy() ? "Adding…" : "Add to Cart" }}
    </button>
    @if (message()) {
      <p class="card-feedback" role="status">{{ message() }}</p>
    }
  </article>`,
})
export class ProductCard {
  product = input.required<Product>();
  sku = computed<Sku | undefined>(
    () =>
      this.product().skus.find((s) => s.is_default) || this.product().skus[0],
  );
  auth = inject(AuthService);
  store = inject(CustomerStore);
  cart = inject(CartApi);
  router = inject(Router);
  busy = signal(false);
  message = signal("");
  imageFailed = signal(false);
  discount() {
    const s = this.sku();
    return s && s.price > 0 && s.finalPrice !== undefined
      ? Math.max(0, Math.round(((s.price - s.finalPrice) / s.price) * 100))
      : 0;
  }
  save() {
    if (!this.store.toggle(this.product()))
      this.message.set("Could not save on this browser.");
  }
  add() {
    if (!this.auth.session()) {
      void this.router.navigate(["/auth"], {
        queryParams: { returnUrl: "/shop/" + this.product().id },
      });
      return;
    }
    const sku = this.sku();
    if (!sku || !this.product().is_active || sku.quantity < 1) return;
    this.busy.set(true);
    this.cart.add(sku.id).subscribe({
      next: (c) => {
        this.store.cartCount.set(c.total_items);
        this.message.set("Added to cart");
      },
      error: (e) => {
        this.message.set(e.error?.message || "Unable to add item. Try again.");
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }
}
