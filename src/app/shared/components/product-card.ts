import { StorefrontAccessService } from "../../core/storefront/storefront-access.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, computed, input, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { Router, RouterLink } from "@angular/router";
import { availableStock, originalPrice, sellingPrice, hasDiscount, discountPercent, promotionName } from "../utils/product-offer";
import { Product, Sku } from "../../core/api/models";
import { AuthService } from "../../core/auth/auth.service";
import { CustomerStore } from "../../core/stores/customer.store";
import { CartApi } from "../../features/cart/cart.api";
import { Icon } from "./icon";
@Component({
  selector: "app-product-card",
  imports: [TranslatePipe, RouterLink, CurrencyPipe, Icon],
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
        <strong>{{ sellingPrice(s) | currency: "USD" }}</strong>
        @if (hasDiscount(s)) {
          <del>{{ originalPrice(s) | currency: "USD" }}</del>
        }
      }
    </div>
    @if (promotionName(sku())) { <p class="product-promotion">{{ promotionName(sku()) }}</p> }
    <p class="product-stock" [class.unavailable]="!product().is_active || available() === 0">
      {{ (product().is_active && available() > 0 ? 'In Stock' : 'Out of Stock') | translate }}
      · {{ 'Available stock' | translate }}: {{ product().is_active ? available() : 0 }}
    </p>
    <button
      class="primary compact"
      [disabled]="
        busy() || !product().is_active || !sku() || available() < 1
      "
      (click)="add()"
    >
      <app-icon name="cart" />{{ (busy() ? "Adding…" : "Add to Cart") | translate }}
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
  private access = inject(StorefrontAccessService);
  router = inject(Router);
  busy = signal(false);
  message = signal("");
  imageFailed = signal(false);
  available = computed(() => availableStock(this.sku()));
  originalPrice = originalPrice;
  sellingPrice = sellingPrice;
  hasDiscount = hasDiscount;
  promotionName = promotionName;
  discount() { return discountPercent(this.sku()); }
  save() {
    if (!this.store.toggle(this.product()))
      this.message.set("Could not save on this browser.");
  }
  add() {
    if (this.busy()) return;
    const sku = this.sku();
    if (!sku || !this.product().is_active || availableStock(sku) < 1) return;
    this.busy.set(true);
    if (!this.auth.session()) {
      this.access.load().subscribe({next: settings => {
        if (settings.guestCart) this.addToCart(sku.id);
        else {this.busy.set(false);void this.router.navigate(['/auth'],{queryParams:{returnUrl:'/cart'}});}
      },error:()=>{this.busy.set(false);this.message.set('Guest access is unavailable. Please try again.');}});
      return;
    }
    this.addToCart(sku.id);
  }
  private addToCart(id:number) {
    this.cart.add(id).subscribe({
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
