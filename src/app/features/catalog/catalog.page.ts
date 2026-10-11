import { Component, inject, signal, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { of, switchMap } from "rxjs";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { CatalogApi } from "./catalog.api";
import { Product } from "../../core/api/models";
import { ProductCard } from "../../shared/product-card";
import { SignInCard } from "../../shared/sign-in-card";
import { Icon } from "../../shared/icon";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
@Component({
  imports: [FormsModule, RouterLink, ProductCard, SignInCard, Icon, Status],
  template: `<div class="breadcrumbs">
      <a routerLink="/">Home</a><app-icon name="chevron" /><span>{{
        search || category || (deals ? "Deals" : "All Categories")
      }}</span>
    </div>
    <section class="catalog-banner">
      <div>
        <h1>
          {{
            search ||
              category ||
              (deals ? "Today’s Deals" : "Shop Smarter, Live Better")
          }}
        </h1>
        <p>Explore fresh finds for every part of your life.</p>
        <a href="#products" class="button primary round"
          >Shop Now <app-icon name="arrow"
        /></a>
      </div>
      <img src="/images/eshop-scene.svg" alt="E-Shop everyday essentials" />
    </section>
    <div class="toolbar" id="products">
      @if (deals && promotions().length) {
        <label
          >Promotion<select
            aria-label="Promotion"
            [ngModel]="promotionId"
            (ngModelChange)="choosePromotion($event)"
          >
            @for (p of promotions(); track p.id) {
              <option [ngValue]="p.id">{{ p.name }}</option>
            }
          </select></label
        >
      }
      <span>{{
        auth.session() ? total() + " Products found" : "Explore the collection"
      }}</span>
      <div class="toolbar-end">
        <label class="inline-label"
          >Sort by:
          <select [(ngModel)]="sort">
            <option value="featured">Featured</option>
            <option value="low">Price: Low to High (page)</option>
            <option value="high">Price: High to Low (page)</option>
            <option value="name">Name (page)</option>
          </select></label
        ><button
          class="icon-button"
          [class.active]="!listView"
          (click)="listView = false"
          aria-label="Grid view"
        >
          <app-icon name="grid" /></button
        ><button
          class="icon-button"
          [class.active]="listView"
          (click)="listView = true"
          aria-label="List view"
        >
          <app-icon name="list" />
        </button>
      </div>
    </div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (!auth.session()) {
      <app-sign-in-card
        action="browse live products and prices"
        [path]="router.url"
      />
    } @else {
      <div class="product-grid" [class.list-view]="listView">
        @for (p of sorted(); track p.id) {
          <app-product-card [product]="p" />
        } @empty {
          @if (!busy() && !error()) {
            <div class="empty">
              <app-icon name="search" />
              <h2>No products found</h2>
              <p>Try another search to find your next favorite.</p>
              <a routerLink="/shop" class="button outline">Browse All</a>
            </div>
          }
        }
      </div>
      <div class="pagination">
        <button
          [disabled]="page <= 1 || busy()"
          (click)="page = page - 1; load()"
        >
          ←</button
        ><span class="page-number">{{ page }}</span
        ><span>of {{ pages() || 1 }}</span
        ><button
          [disabled]="page >= pages() || busy()"
          (click)="page = page + 1; load()"
        >
          →
        </button>
      </div>
    }`,
})
export class CatalogPage extends PageState {
  auth = inject(AuthService);
  api = inject(CatalogApi);
  route = inject(ActivatedRoute);
  router = inject(Router);
  destroy = inject(DestroyRef);
  products = signal<Product[]>([]);
  total = signal(0);
  pages = signal(0);
  page = 1;
  search = "";
  sort = "featured";
  listView = false;
  category = "";
  deals = false;
  promotionId = 0;
  promotions = signal<{ id: number; name: string }[]>([]);
  constructor() {
    super();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((q) => {
        this.search = q.get("q") || "";
        this.category = q.get("category") || "";
        this.deals = q.get("collection") === "deals";
        this.page = 1;
        this.load();
      });
  }
  choosePromotion(id: number) {
    this.promotionId = id;
    this.page = 1;
    this.load();
  }
  load() {
    if (!this.auth.session()) return;
    const source = this.deals
      ? this.api.activePromotions().pipe(
          switchMap((rows) => {
            this.promotions.set(rows);
            if (!rows.some((row) => row.id === this.promotionId))
              this.promotionId = rows[0]?.id || 0;
            return this.promotionId
              ? this.api.promotionPage(this.promotionId, this.page)
              : of({ payload: [], total_items: 0, total_pages: 0 });
          }),
        )
      : this.category
        ? this.api.category(this.category, this.page)
        : this.api.list(this.page, this.search);
    this.run(
      source,
      (result) => {
        this.products.set(result.payload);
        this.total.set(result.total_items);
        this.pages.set(result.total_pages);
      },
      true,
    );
  }
  sorted() {
    const p = [...this.products()];
    const price = (v: Product) => {
      const sku = v.skus.find((option) => option.is_default) || v.skus[0];
      return sku?.finalPrice ?? sku?.price ?? 0;
    };
    return this.sort === "name"
      ? p.sort((a, b) => a.name.localeCompare(b.name))
      : this.sort === "low"
        ? p.sort((a, b) => price(a) - price(b))
        : this.sort === "high"
          ? p.sort((a, b) => price(b) - price(a))
          : p;
  }
}
