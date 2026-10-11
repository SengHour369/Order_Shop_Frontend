import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { forkJoin } from "rxjs";
import { AuthService } from "../../core/auth/auth.service";
import { CustomerStore } from "../../core/state/customer.store";
import { OrdersApi } from "../orders/orders.api";
import { AddressesApi } from "../addresses/addresses.api";
import { Order } from "../../core/api/models";
import { Icon } from "../../shared/icon";
import { SignInCard } from "../../shared/sign-in-card";
import { PageState } from "../../shared/page-state";
import { Status } from "../../shared/status";
@Component({
  imports: [RouterLink, CurrencyPipe, DatePipe, Icon, SignInCard, Status],
  template: `<section class="account-banner">
      <div>
        <span class="eyebrow">YOUR PERSONAL SHOPPING SPACE</span>
        <h1>Hello, {{ auth.session()?.username || "welcome" }}!</h1>
        <p>Everything you need for a little more everyday.</p>
      </div>
      <div class="banner-art"><app-icon name="bag" /></div>
    </section>
    @if (!auth.session()) {
      <app-sign-in-card
        action="see your orders, saved addresses, and account updates"
      />
    }
    <app-status [busy]="busy()" [error]="error()" />
    <div class="dashboard-stats">
      @for (c of cards(); track c.title) {
        <a class="panel stat-card" [routerLink]="c.link"
          ><span class="icon-circle"><app-icon [name]="c.icon" /></span>
          <div>
            <strong>{{ c.value }}</strong>
            <p>{{ c.title }}</p>
          </div>
          <app-icon name="chevron"
        /></a>
      }
    </div>
    <div class="section-heading">
      <h2>Recent Orders</h2>
      <a routerLink="/account/orders">View All <app-icon name="arrow" /></a>
    </div>
    <div class="panel">
      @for (o of recent(); track o.id) {
        <a class="line-item" [routerLink]="['/account/orders', o.id]"
          ><span class="icon-circle"><app-icon name="box" /></span>
          <div class="grow">
            <h3>{{ o.order_number }}</h3>
            <p>{{ o.order_date | date: "mediumDate" }}</p>
          </div>
          <span class="badge">{{ o.status }}</span
          ><strong>{{ o.total_amount | currency: "USD" }}</strong
          ><app-icon name="chevron"
        /></a>
      } @empty {
        <div class="empty">
          <app-icon name="box" />
          <h3>Your next great find is waiting</h3>
          <p>
            {{
              auth.session()
                ? "Your orders will appear here."
                : "Sign in to view your recent orders."
            }}
          </p>
          <a routerLink="/shop" class="button outline">Start Shopping</a>
        </div>
      }
    </div>
    <div class="dashboard-links">
      <a routerLink="/account/security" class="panel"
        ><span class="icon-circle green"><app-icon name="shield" /></span>
        <h3>Account Security</h3>
        <p>Manage access to your account.</p>
        <span>Review Security →</span></a
      ><a routerLink="/account/support" class="panel"
        ><span class="icon-circle blue"><app-icon name="headphones" /></span>
        <h3>Need a hand?</h3>
        <p>Find answers and order support.</p>
        <span>Get Help →</span></a
      >
    </div>`,
})
export class DashboardPage extends PageState {
  auth = inject(AuthService);
  store = inject(CustomerStore);
  orders = inject(OrdersApi);
  addresses = inject(AddressesApi);
  recent = signal<Order[]>([]);
  total = signal<number | null>(null);
  addressCount = signal<number | null>(null);
  constructor() {
    super();
    if (this.auth.session())
      this.run(
        forkJoin({
          orders: this.orders.list(),
          addresses: this.addresses.list(),
        }),
        (r) => {
          this.recent.set(r.orders.content.slice(0, 4));
          this.total.set(r.orders.totalElements);
          this.addressCount.set(r.addresses.length);
        },
      );
  }
  cards() {
    return [
      {
        title: "Total Orders",
        value: this.total() ?? "—",
        icon: "box",
        link: "/account/orders",
      },
      {
        title: "Saved Addresses",
        value: this.addressCount() ?? "—",
        icon: "pin",
        link: "/account/addresses",
      },
      {
        title: "Wishlist Items",
        value: this.store.savedCount(),
        icon: "heart",
        link: "/account/wishlist",
      },
    ];
  }
}
