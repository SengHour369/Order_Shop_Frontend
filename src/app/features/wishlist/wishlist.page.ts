import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { CustomerStore } from "../../core/stores/customer.store";
import { ProductCard } from "../../shared/components/product-card";
import { Icon } from "../../shared/components/icon";
@Component({
  imports: [TranslatePipe, FormsModule, RouterLink, ProductCard, Icon],
  template: `<section class="account-banner">
      <div>
        <h1>My Wishlist</h1>
        <p>Save your favorite products and shop them later.</p>
      </div>
      <div class="banner-art heart-art"><app-icon name="heart" /></div>
      <div class="banner-stat">
        <strong>{{ store.savedCount() }}</strong
        ><span>Saved Items</span><app-icon name="heart" />
      </div>
    </section>
    <div class="toolbar">
      <span class="tab active">All Items ({{ store.savedCount() }})</span>
      <div class="sort-control">
        <label for="wishlist-sort">Sort by:</label
        ><select id="wishlist-sort" [(ngModel)]="sort">
          <option value="recent">Most Recent</option>
          <option value="name">{{ "Name" | translate }}</option>
          <option value="price">Price: Low to High</option>
        </select>
      </div>
    </div>
    <p class="small muted">
      Saved in this browser for your current account. Prices are confirmed when
      you add to cart.
    </p>
    <div class="product-grid wishlist-grid">
      @for (p of sorted(); track p.id) {
        <app-product-card [product]="p" />
      } @empty {
        <section class="empty">
          <span class="empty-icon"><app-icon name="heart" /></span>
          <h2>Make room for your favorites</h2>
          <p>Tap the heart on a product to save it here.</p>
          <a class="button primary" routerLink="/shop"
            >Discover Products <app-icon name="arrow"
          /></a>
        </section>
      }
    </div>`,
})
export class WishlistPage {
  store = inject(CustomerStore);
  sort = "recent";
  sorted() {
    const p = [...this.store.saved()];
    return this.sort === "name"
      ? p.sort((a, b) => a.name.localeCompare(b.name))
      : this.sort === "price"
        ? p.sort(
            (a, b) =>
              (a.skus[0]?.finalPrice ?? a.skus[0]?.price ?? 0) -
              (b.skus[0]?.finalPrice ?? b.skus[0]?.price ?? 0),
          )
        : p;
  }
}
