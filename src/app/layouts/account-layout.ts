import { TranslatePipe } from "../core/i18n/translate.pipe";
import { Component, inject } from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { Icon } from "../shared/components/icon";
import { AuthService } from "../core/auth/auth.service";
import { CustomerStore } from "../core/stores/customer.store";
@Component({
  imports: [TranslatePipe, RouterLink, RouterLinkActive, RouterOutlet, Icon],
  styles: [`.account-layout.wishlist-layout { display: block; } @media(max-width:700px) { .addresses-layout .account-sidebar, .tracking-layout .account-sidebar, .addresses-breadcrumbs, .tracking-breadcrumbs { display:none; } }`],
  template: `@if (!isWishlist()) { <div class="breadcrumbs" [class.addresses-breadcrumbs]="isAddresses()" [class.tracking-breadcrumbs]="isTracking()">
      <a routerLink="/">{{ "Home" | translate }}</a><app-icon name="chevron" /><a
        routerLink="/account"
        >{{ "Account" | translate }}</a
      >
      @if (isTracking()) { <app-icon name="chevron" /><a routerLink="/account/orders">{{ 'My Orders' | translate }}</a><app-icon name="chevron" /><b>{{ 'Track Order' | translate }}</b> }
      @if (isAddresses()) { <app-icon name="chevron" /><a routerLink="/account/addresses">{{ 'My Addresses' | translate }}</a> }
      @if (router.url.includes('/addresses/add') || router.url.endsWith('/edit')) { <app-icon name="chevron" /><b>{{ (router.url.endsWith('/edit') ? 'Edit Address' : 'Add Address') | translate }}</b> }
    </div>
    } <div class="account-layout" [class.wishlist-layout]="isWishlist()" [class.addresses-layout]="isAddresses()" [class.tracking-layout]="isTracking()"> @if (!isWishlist()) {
      <aside class="account-sidebar">
        <h2 class="account-nav-title">My Account</h2>
        <nav aria-label="Account navigation">
          @for (item of links; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="selected"
              [routerLinkActiveOptions]="{ exact: item.path === '/account' }"
              ><app-icon [name]="item.icon" /><span>{{ (item.label) | translate }}</span>
              @if (item.icon === "bell" && store.unread()) {
                <b class="count">{{ store.unread() }}</b>
              }
            </a>
          }
          <div class="sidebar-divider"></div>
          @if (auth.session()) {
            <button class="logout" (click)="logoutDialog.showModal()">
              <app-icon name="logout" /> {{ "Logout" | translate }}
            </button>
          } @else {
            <a routerLink="/auth"><app-icon name="logout" /> {{ "Sign In" | translate }}</a>
          }
        </nav>
      </aside>
      } <section class="account-content"><router-outlet /></section>
    </div>
    <dialog
      #logoutDialog
      class="customer-dialog logout-dialog"
      aria-labelledby="logout-title"
    >
      <button
        class="icon-button dialog-close"
        aria-label="Close logout confirmation"
        (click)="logoutDialog.close()"
      >
        <app-icon name="close" />
      </button>
      <span class="logout-symbol"><app-icon name="logout" /></span>
      <h2 id="logout-title">Are you sure you want to logout?</h2>
      <p>
        You will be signed out from your account.<br />You can sign in again to
        continue shopping.
      </p>
      <div class="dialog-actions">
        <button (click)="logoutDialog.close()">{{ "Cancel" | translate }}</button
        ><button class="primary" (click)="logoutDialog.close(); logout()">
          {{ "Logout" | translate }}
        </button>
      </div>
    </dialog>`,
})
export class AccountLayout {
  auth = inject(AuthService);
  store = inject(CustomerStore);
  router = inject(Router);
  isTracking() { return /^\/account\/orders\/\d+\/track(?:[?#]|$)/.test(this.router.url); }
  isAddresses() { return this.router.url.split(/[?#]/)[0].startsWith("/account/addresses"); }
  isWishlist() { return this.router.url.split(/[?#]/)[0] === "/account/wishlist"; }
  links = [
    { path: "/account", label: "Dashboard", icon: "home" },
    { path: "/account/orders", label: "My Orders", icon: "box" },
    { path: "/account/addresses", label: "My Addresses", icon: "pin" },
    { path: "/account/payments", label: "Payment Methods", icon: "card" },
    { path: "/account/wishlist", label: "Wishlist", icon: "heart" },
    { path: "/account/notifications", label: "Notifications", icon: "bell" },
    { path: "/account/settings", label: "Account Settings", icon: "settings" },
    { path: "/account/security", label: "Security", icon: "shield" },
    { path: "/account/support", label: "Help & Support", icon: "help" },
  ];
  logout() {
    this.auth
      .logout()
      .subscribe({ next: () => this.finish(), error: () => this.finish() });
  }
  private finish() {
    this.auth.clear();
    void this.router.navigate(["/auth"]);
  }
}
