import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Icon } from "../../shared/components/icon";
@Component({
  imports: [TranslatePipe, RouterLink, Icon],
  template: `<div class="page-heading">
      <div>
        <h1>{{ "All Categories" | translate }}</h1>
        <p>Explore our wide range of products.</p>
      </div>
      <div class="breadcrumbs">
        <a routerLink="/">{{ "Home" | translate }}</a><app-icon name="chevron" /><span
          >{{ "Categories" | translate }}</span
        >
      </div>
    </div>
    <section class="category-reference-banner" aria-label="Electronics collection">
      <a routerLink="/shop" [queryParams]="{ category: 'Electronics' }" aria-label="Shop Electronics">
        <img src="/images/electronics-category-banner.png" width="1280" height="546" fetchpriority="high"
          alt="Electronics. Latest Tech For a Smarter Life. Discover your next everyday essential. Shop Electronics." />
      </a>
    </section>
    <div class="section-heading">
      <h2>Shop by Category</h2>
      <a routerLink="/shop">{{ "View All" | translate }} <app-icon name="arrow" /></a>
    </div>
    <nav
      class="category-tiles category-directory"
      aria-label="Product categories"
    >
      @for (c of categories; track c.name) {
        <a routerLink="/shop" [queryParams]="{ category: c.name }"
          ><span><app-icon [name]="c.icon" /></span
          ><strong>{{ c.name }}</strong></a
        >
      }
    </nav>`,
})
export class CategoriesPage {
  categories = [
    { name: "Electronics", icon: "laptop" },
    { name: "Fashion", icon: "shirt" },
    { name: "Home & Living", icon: "sofa" },
    { name: "Beauty & Health", icon: "beauty" },
    { name: "Sports & Fitness", icon: "sports" },
    { name: "Toys & Games", icon: "game" },
    { name: "Groceries", icon: "bag" },
    { name: "Books", icon: "box" },
    { name: "Office & Stationery", icon: "card" },
  ];
}
