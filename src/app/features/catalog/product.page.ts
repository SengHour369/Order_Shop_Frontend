import { Component, inject, signal, computed } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { CatalogApi } from "./catalog.api";
import { CartApi } from "../cart/cart.api";
import { Product } from "../../core/api/models";
import { AuthService } from "../../core/auth/auth.service";
import { CustomerStore } from "../../core/state/customer.store";
import { Icon } from "../../shared/icon";
import { PageState } from "../../shared/page-state";
import { ProductImage } from "../../shared/product-image";
import { Status } from "../../shared/status";
@Component({
  imports: [CurrencyPipe, FormsModule, RouterLink, Icon, Status, ProductImage],
  template: `<div class="breadcrumbs">
      <a routerLink="/">Home</a><app-icon name="chevron" /><a routerLink="/shop"
        >Products</a
      ><app-icon name="chevron" /><span>{{
        product()?.name || "Product details"
      }}</span>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (product(); as p) {
      <section class="product-detail">
        <div class="product-gallery">
          <div class="thumbnail-column">
            @for (image of p.main_image; track $index; let i = $index) {
              <button
                [class.selected]="imageIndex === i"
                (click)="imageIndex = i"
                [attr.aria-label]="'Product image ' + (i + 1)"
              >
                <img appProductImage [src]="image" alt="" />
              </button>
            }
          </div>
          <div class="main-product-image">
            @if (p.main_image.length) {
              <img
                appProductImage
                [src]="p.main_image[imageIndex]"
                [alt]="p.name"
              />
            } @else {
              <app-icon name="bag" />
            }
          </div>
        </div>
        <div class="product-description">
          <span class="badge">{{
            p.is_active ? "Available in catalog" : "Currently unavailable"
          }}</span>
          <h1>{{ p.name }}</h1>
          @if (selected(); as s) {
            <div class="product-detail-price">
              <strong class="purchase-price">{{
                s.finalPrice ?? s.price | currency: "USD"
              }}</strong>
              @if (s.finalPrice !== undefined && s.finalPrice < s.price) {
                <del>{{ s.price | currency: "USD" }}</del>
              }
            </div>
          }
          <p class="product-option">{{ selected()?.sku }}</p>
          <p>{{ p.description }}</p>
          <h3>Choose your option</h3>
          <div class="sku-options">
            @for (s of p.skus; track s.id) {
              <button
                [attr.aria-pressed]="skuId() === s.id"
                [class.selected]="skuId() === s.id"
                (click)="skuId.set(s.id)"
              >
                @if (s.image_url) {
                  <img appProductImage [src]="s.image_url" alt="" />
                }
                {{ s.sku }}
              </button>
            }
          </div>
          <p class="small muted">
            Select a product option to see its current price.
          </p>
        </div>
        <aside class="purchase-card panel">
          @if (selected(); as s) {
            <p class="stock">
              <app-icon name="check" />{{
                s.quantity > 0 ? "In Stock" : "Out of Stock"
              }}
            </p>
            <span class="small muted">SKU: {{ s.sku }}</span>
            <div class="buy-row">
              <div class="quantity">
                <button
                  (click)="quantity = quantity - 1"
                  [disabled]="quantity <= 1"
                  aria-label="Decrease quantity"
                >
                  −</button
                ><input
                  aria-label="Quantity"
                  type="number"
                  [(ngModel)]="quantity"
                  min="1"
                  max="99"
                /><button
                  (click)="quantity = quantity + 1"
                  [disabled]="quantity >= 99"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                class="primary"
                [disabled]="
                  busy() ||
                  !p.is_active ||
                  (selected()?.quantity ?? 0) < 1 ||
                  quantity < 1 ||
                  quantity > 99 ||
                  quantity % 1 !== 0
                "
                (click)="add(false)"
              >
                <app-icon name="cart" /> Add to Cart
              </button>
            </div>
            <button
              class="outline full"
              [disabled]="
                busy() ||
                !p.is_active ||
                (selected()?.quantity ?? 0) < 1 ||
                quantity < 1 ||
                quantity > 99 ||
                quantity % 1 !== 0
              "
              (click)="add(true)"
            >
              Buy Now
            </button>
          }
          <button class="outline full" (click)="save(p)">
            <app-icon name="heart" />{{
              store.has(p.id) ? "Remove from Wishlist" : "Add to Wishlist"
            }}
          </button>
          <div class="purchase-perk">
            <span class="icon-circle blue"><app-icon name="truck" /></span>
            <div>
              <h3>Delivery Updates</h3>
              <p>Track your order status</p>
            </div>
          </div>
          <div class="purchase-perk">
            <span class="icon-circle orange"><app-icon name="box" /></span>
            <div>
              <h3>Order Support</h3>
              <p>Help through your account</p>
            </div>
          </div>
          <div class="purchase-perk">
            <span class="icon-circle green"><app-icon name="shield" /></span>
            <div>
              <h3>Payment Confirmation</h3>
              <p>Verified by the payment service</p>
            </div>
          </div>
        </aside>
      </section>
      <div class="product-tabs">
        <button class="active">Overview</button
        ><a routerLink="/account/support">Shipping & Returns</a>
      </div>
      <div class="overview-columns">
        <section>
          <h2>Product Description</h2>
          <p>{{ p.description || "Select a product option for details." }}</p>
        </section>
        <section>
          <h2>Available Options</h2>
          @for (s of p.skus; track s.id) {
            <p>
              <app-icon name="check" /> {{ s.sku }} ·
              {{ s.finalPrice ?? s.price | currency: "USD" }}
            </p>
          }
        </section>
      </div>
    }`,
})
export class ProductPage extends PageState {
  api = inject(CatalogApi);
  cart = inject(CartApi);
  auth = inject(AuthService);
  store = inject(CustomerStore);
  route = inject(ActivatedRoute);
  router = inject(Router);
  product = signal<Product | null>(null);
  skuId = signal(0);
  selected = computed(() =>
    this.product()?.skus.find((s) => s.id === this.skuId()),
  );
  imageIndex = 0;
  quantity = 1;
  constructor() {
    super();
    this.run(
      this.api.detail(Number(this.route.snapshot.paramMap.get("id"))),
      (p) => {
        p.main_image = p.main_image || [];
        p.skus = p.skus || [];
        this.product.set(p);
        this.skuId.set(
          p.skus.find((s) => s.is_default)?.id || p.skus[0]?.id || 0,
        );
      },
    );
  }
  add(buy: boolean) {
    this.run(this.cart.add(this.skuId(), this.quantity), (c) => {
      this.store.cartCount.set(c.total_items);
      if (buy) void this.router.navigate(["/checkout"]);
      else this.message.set("Added to your cart.");
    });
  }
  save(p: Product) {
    if (!this.store.toggle(p))
      this.error.set("Your browser could not save this wishlist.");
  }
}
