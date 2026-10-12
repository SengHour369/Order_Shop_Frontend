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
  template: `<div class="breadcrumbs">
      <a routerLink="/">{{ "Home" | translate }}</a><app-icon name="chevron" /><a
        routerLink="/account"
        >My Account</a
      >
    </div>
    <div class="account-layout">
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
      <section class="account-content"><router-outlet /></section>
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
