import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { AuthService } from "./core/auth/auth.service";
import { CustomerStore } from "./core/state/customer.store";
import { Icon } from "./shared/icon";
import { CustomerChat } from "./features/assistant/customer-chat";
@Component({
  selector: "app-root",
  host: {
    "[class.customer-experience]": "!isAdmin() && !isAssistant()",
    "[class.customer-welcome-page]": "router.url.split('?')[0] === '/'",
    "[class.customer-auth-page]": "router.url.split('?')[0] === '/auth'",
    "[class.customer-scanner-page]": "router.url.split('?')[0] === '/scanner'",
  },
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    Icon,
    CustomerChat,
  ],
  template: `<a class="skip-link" href="#main">Skip to content</a>
    @if (!isAdmin() && !isAssistant()) {
      <header class="shop-header">
        <div class="header-top">
          <a routerLink="/" class="brand"
            ><span class="brand-bag"><app-icon name="check" /></span
            ><span>E-Shop<small>Shop Smarter. Live Better.</small></span></a
          >
          @if (router.url.split("?")[0] === "/") {
            <nav class="welcome-navigation" aria-label="Welcome navigation">
              <a routerLink="/">Home</a><a routerLink="/shop">Shop</a
              ><a routerLink="/categories">Categories</a
              ><a routerLink="/shop" [queryParams]="{ collection: 'deals' }"
                >Promotions</a
              ><a routerLink="/account/support">Help</a>
            </nav>
          }
          <form class="header-search" (ngSubmit)="search()">
            <app-icon name="search" /><input
              aria-label="Search products"
              name="search"
              [(ngModel)]="query"
              placeholder="Search for products, brands and more..."
            /><button class="search-button" aria-label="Search">
              <app-icon name="search" />
            </button>
            <a class="header-camera" routerLink="/scanner" aria-label="Scan a product with camera" title="Scan a product"><app-icon name="camera" /></a>
          </form>
          <div class="header-actions">
            @if (staff()) {
              <a
                aria-label="Admin dashboard"
                routerLink="/admin"
                routerLinkActive="active"
                ><span class="header-action-icon"
                  ><app-icon name="settings" /></span
                ><span>Admin</span></a
              >
            }
            <a
              aria-label="Wishlist"
              routerLink="/account/wishlist"
              routerLinkActive="active"
              ><span class="header-action-icon"
                ><app-icon name="heart" />
                @if (store.savedCount()) {
                  <b class="count">{{ store.savedCount() }}</b>
                }</span
              ><span>Wishlist</span></a
            ><a
              aria-label="Shopping cart"
              routerLink="/cart"
              routerLinkActive="active"
              ><span class="header-action-icon"
                ><app-icon name="cart" />
                @if (store.cartCount()) {
                  <b class="count">{{ store.cartCount() }}</b>
                }</span
              ><span>Cart</span></a
            >
            @if (!auth.session() && router.url.split("?")[0] === "/") {
              <a class="button outline welcome-sign-in" routerLink="/auth"
                >Sign In</a
              >
              <a
                class="button primary welcome-register"
                routerLink="/auth"
                [queryParams]="{ mode: 'Register' }"
                >Register</a
              >
            } @else {
              <a
                class="account-link"
                [routerLink]="auth.session() ? '/account' : '/auth'"
                ><span class="mini-avatar"><app-icon name="user" /></span
                ><span>{{ auth.session()?.username || "Sign In" }}</span
                ><app-icon name="down"
              /></a>
            }
          </div>
        </div>
        <nav class="category-nav" aria-label="Shop navigation">
          <a class="all-categories" routerLink="/categories"
            ><app-icon name="list" /> All Categories</a
          >
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            >Home</a
          >
          <a routerLink="/categories" routerLinkActive="active">Categories</a>
          <a routerLink="/shop" routerLinkActive="active">Products</a>
          <a routerLink="/shop" [queryParams]="{ collection: 'deals' }"
            >Promotions</a
          >
          <a routerLink="/shop" [queryParams]="{ collection: 'new' }"
            >New Arrivals</a
          >
          <a routerLink="/scanner">Product Finder</a>
        </nav>
      </header>
    }
    <main
      id="main"
      tabindex="-1"
      class="site-main"
      [class.admin-host]="isAdmin() || isAssistant()"
      [style.max-width]="isAssistant() ? 'none' : null"
      [style.padding]="isAssistant() ? '0' : null"
    >
      <router-outlet />
    </main>
    @if (!isAdmin() && !isAssistant()) {
      <footer class="site-footer">
        <a class="brand" routerLink="/"
          ><span class="brand-bag"><app-icon name="check" /></span
          ><span>E-Shop<small>Shop Smarter. Live Better.</small></span></a
        >
        <p>Everything you love. All in one place.</p>
        <a routerLink="/account/support">Help & Support</a
        ><a routerLink="/account/security">Account Security</a>
      </footer>
      <nav class="mobile-nav" aria-label="Mobile shop navigation">
        <a
          routerLink="/"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="{ exact: true }"
          ><app-icon name="home" /><span>Home</span></a
        >
        <a
          routerLink="/categories"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          ><app-icon name="grid" /><span>Categories</span></a
        >
        <a class="mobile-scan" routerLink="/scanner" routerLinkActive="active" ariaCurrentWhenActive="page" aria-label="Scan a product"><span><app-icon name="camera" /></span><small>Scan</small></a>
        <a
          routerLink="/cart"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          ><span class="mobile-nav-icon"
            ><app-icon name="cart" />
            @if (store.cartCount()) {
              <b class="count">{{
                (store.cartCount() ?? 0) > 99 ? "99+" : store.cartCount()
              }}</b>
            }</span
          ><span>Cart</span></a
        >
        <a
          routerLink="/account"
          [class.active]="accountActive()"
          [attr.aria-current]="accountActive() ? 'page' : null"
          ><app-icon name="user" /><span>Account</span></a
        >
      </nav>
      <app-customer-chat />
    }`,
})
export class App {
  auth = inject(AuthService);
  store = inject(CustomerStore);
  router = inject(Router);
  query = "";
  categories = [
    { name: "Electronics", icon: "laptop" },
    { name: "Fashion", icon: "shirt" },
    { name: "Home & Living", icon: "home" },
    { name: "Beauty & Health", icon: "beauty" },
    { name: "Sports & Fitness", icon: "sports" },
  ];
  isAdmin() {
    return this.router.url.split("?")[0].startsWith("/admin");
  }
  isAssistant() {
    return this.router.url.split("?")[0] === "/assistant";
  }
  accountActive() {
    const path = this.router.url.split(/[?#]/)[0];
    return (
      path === "/auth" ||
      (path.startsWith("/account") && !path.startsWith("/account/orders"))
    );
  }
  staff() {
    return ["ADMIN", "MANAGER"].includes(this.auth.session()?.role || "");
  }
  search() {
    void this.router.navigate(["/shop"], {
      queryParams: { q: this.query.trim() },
    });
  }
}
