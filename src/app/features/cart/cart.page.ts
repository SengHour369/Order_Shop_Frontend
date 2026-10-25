import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CatalogApi } from "../catalog/catalog.api";
import { Icon } from '../../shared/components/icon';
import { ProductImage } from '../../shared/components/product-image';
import { AuthService } from "../../core/auth/auth.service";
import { StorefrontAccessService } from "../../core/storefront/storefront-access.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { CartApi } from "./cart.api";
import { Cart, CartItem } from "../../core/api/models";
import { CustomerStore } from "../../core/stores/customer.store";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [Icon, ProductImage, TranslatePipe, CurrencyPipe, RouterLink, Status],
  template: `<div class="breadcrumbs">
      <a routerLink="/">{{ "Home" | translate }}</a><span>›</span><span>{{ "Cart" | translate }}</span>
    </div>
    <h1>{{ "Shopping Cart" | translate }}</h1>
    <p class="muted">{{ cart()?.total_items || 0 }} items in your cart</p>
    <app-status [busy]="busy()" [error]="error()" />
    @if (cart(); as c) {
      <div class="checkout-grid customer-cart">
        <div class="panel">
          @for (item of c.items; track item.id) {
            <div class="line-item">
              <a class="cart-item-picture" [routerLink]="productDetails()[item.product_sku_id] ? ['/shop',productDetails()[item.product_sku_id].id] : null" [attr.aria-label]="'View ' + productName(item)">@if(productImage(item)){<img appProductImage [src]="productImage(item)" alt="" loading="lazy" />}@else{<app-icon name="bag" />}</a>
              <div class="cart-item-details">
                <h3>@if(productDetails()[item.product_sku_id]; as product){<a [routerLink]="['/shop',product.id]">{{productName(item)}}</a>}@else{ {{productName(item)}} }</h3>
                @if(productDetails()[item.product_sku_id]?.variant){<small class="cart-variant">{{productDetails()[item.product_sku_id].variant}}</small>}
                <span class="muted">{{
                  item.total_price | currency: "USD"
                }}</span>
              </div>
              <div class="quantity">
                <button
                  aria-label="Decrease quantity"
                  [disabled]="busy() || item.quantity <= 1"
                  (click)="update(item, -1)"
                >
                  −</button
                ><span>{{ item.quantity }}</span
                ><button
                  aria-label="Increase quantity"
                  [disabled]="busy()"
                  (click)="update(item, 1)"
                >
                  +
                </button>
              </div>
              <button
                class="text-button"
                [disabled]="busy()"
                (click)="remove(item.id)"
              >
                {{ "Remove" | translate }}
              </button>
            </div>
          } @empty {
            <div class="empty">
              <h2>Your cart is waiting</h2>
              <a routerLink="/shop">Find something you love →</a>
            </div>
          }
        </div>
        <aside class="panel">
          <h2>{{ "Order Summary" | translate }}</h2>
          <p>{{ c.total_items }} items</p>
          <div class="total">
            <span>{{ "Total" | translate }}</span
            ><strong>{{ c.total_price | currency: "USD" }}</strong>
          </div>
          @if (c.items.length) {
            @if (auth.session() || access.settings()?.guestCheckout) {
            <a class="button primary full" routerLink="/checkout"
              >Continue to checkout →</a>
            } @else {<p>Guest checkout is currently unavailable.</p><a class="button primary full" routerLink="/auth" [queryParams]="{returnUrl:'/checkout'}">Sign in to checkout</a>}
            <button
              class="button outline cart-clear"
              [disabled]="busy()"
              (click)="clear()"
            >
              {{ "Clear Cart" | translate }}
            </button>
          }
          <p class="muted">Final prices and stock are confirmed at checkout.</p>
        </aside>
      </div>
    }`,
})
export class CartPage extends PageState {
  private catalog = inject(CatalogApi);
  private destroy = inject(DestroyRef);
  private requested = new Set<number>();
  productDetails = signal<Record<number,{id:number;name:string;image:string;variant:string}>>({});
  productName(item:CartItem){return this.productDetails()[item.product_sku_id]?.name || item.product_name || ('Product SKU #'+item.product_sku_id);}
  productImage(item:CartItem){return this.productDetails()[item.product_sku_id]?.image || item.image_url || '';}
  api = inject(CartApi);
  auth = inject(AuthService);
  access = inject(StorefrontAccessService);
  store = inject(CustomerStore);
  cart = signal<Cart | null>(null);
  constructor() {
    super();
    this.run(this.api.load(), (c) => this.show(c));
  }
  show(c: Cart) {
    this.cart.set(c);
    for(const id of new Set(c.items.map(item=>item.product_sku_id))){
      if(this.requested.has(id))continue;
      this.requested.add(id);
      this.catalog.forSku(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
        next:product=>{
          const sku=product.skus.find(s=>s.id===id);
          this.productDetails.update(details=>({...details,[id]:{id:product.id,name:product.name,image:sku?.image_url||product.main_image?.[0]||'',variant:sku?.description||sku?.sku||''}}));
        },
        error:()=>{this.requested.delete(id);}
      });
    }
    this.store.cartCount.set(c.total_items);
  }
  update(i: CartItem, delta: number) {
    this.run(this.api.update(i.id, i.product_sku_id, i.quantity + delta), (c) =>
      this.show(c),
    );
  }
  remove(id: number) {
    this.run(this.api.remove(id), (c) => this.show(c));
  }
  clear() {
    if (!confirm("Remove every item from your bag?")) return;
    this.run(this.api.clear(), (c) => this.show(c));
  }
}
