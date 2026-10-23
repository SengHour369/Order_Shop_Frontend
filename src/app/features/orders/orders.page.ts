import { ChatOrder } from '../assistant/chat-order';
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, inject, input, signal } from "@angular/core";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { OrdersApi } from "./orders.api";
import { Order } from "../../core/api/models";
import { AuthService } from "../../core/auth/auth.service";
import { Icon } from "../../shared/components/icon";
import { OrderProgress } from "../../shared/components/order-progress";
import { SignInCard } from "../../shared/components/sign-in-card";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  selector: "app-customer-orders",
  styleUrl: "./orders-embedded.css",
  imports: [ChatOrder, TranslatePipe,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    Icon,
    OrderProgress,
    SignInCard,
    Status,
  ],
  template: `@if (embedded()) {
    <section class="embedded-orders" aria-label="My orders">
      <header><span class="embedded-orders-icon"><app-icon name="cart" /></span><div><h3>My Orders</h3><p>Manage and view your orders.</p></div></header>
      @if (!auth.session()) {<app-sign-in-card action="view your orders" path="/account/orders" />}
      @else {
        <div class="embedded-filters"><label><app-icon name="search" /><input aria-label="Search orders on this page" [(ngModel)]="search" placeholder="Search order number or status on this page…" /></label><select aria-label="Order status" [ngModel]="status" (ngModelChange)="filter($event)" [disabled]="busy()">@for(tab of tabs; track tab.value){<option [value]="tab.value">{{tab.label}}</option>}</select><input type="date" aria-label="Order date on this page" [(ngModel)]="date" /><button type="button" (click)="resetFilters()" [disabled]="busy()">Reset</button></div>
        <app-status [busy]="busy()" [error]="error()" />
        @if(error()){<button type="button" (click)="load()" [disabled]="busy()">Retry</button>}
        <div class="embedded-table-wrap"><table><thead><tr><th>Order No.</th><th>Date</th><th>Items</th><th>Total Amount</th><th>Payment Method</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          @for(order of filtered();track order.id){<tr><td><button type="button" class="order-number" (click)="selectedId.set(order.id)">{{order.order_number}}</button></td><td>{{order.order_date | date:'mediumDate'}}</td><td>{{order.items?.length ?? 0}} items</td><td>{{order.total_amount | currency:'USD'}}</td><td>{{order.paymentMethod || '—'}}</td><td><span class="embedded-status" [class.delivered]="order.status === 'DELIVERED' || order.status === 'COMPLETED'" [class.processing]="order.status === 'PROCESSING' || order.status === 'SHIPPED'" [class.cancelled]="order.status === 'CANCELLED' || order.status === 'FAILED'">{{order.status}}</span></td><td><button type="button" (click)="selectedId.set(order.id)">View Details</button></td></tr>}
          @empty{<tr><td colspan="7">{{busy() ? 'Loading orders…' : 'No matching orders on this page.'}}</td></tr>}
        </tbody></table></div>
        <nav class="embedded-pagination" aria-label="Order pages"><button type="button" [disabled]="page === 0 || busy()" (click)="page = page - 1; load()">Previous</button><span aria-live="polite">{{page + 1}} / {{pages || 1}}</span><button type="button" [disabled]="page + 1 >= pages || busy()" (click)="page = page + 1; load()">Next</button></nav>
        @if(selectedId(); as id){<section class="embedded-detail"><div class="embedded-detail-heading"><h3>Order Details</h3><button type="button" (click)="selectedId.set(null)" aria-label="Close order details">Close</button></div><app-chat-order [orderId]="id" [language]="language()" /></section>}
      }
    </section>
  } @else {<div class="page-heading">
      <div>
        <h1>{{ "My Orders" | translate }}</h1>
        <p>Track, manage and view all your orders in one place.</p><a routerLink="/account/returns">{{ 'My Returns' | translate }}</a>
      </div>
      <div class="inline-search">
        <app-icon name="search" /><input
          aria-label="Search orders on this page"
          [(ngModel)]="search"
          placeholder="Search order number on this page..."
        />
      </div>
    </div>
    <div class="toolbar order-toolbar">
      <div class="filter-tabs">
        @for (t of tabs; track t.value) {
          <button
            class="tab"
            [class.active]="status === t.value"
            (click)="filter(t.value)"
            [disabled]="busy()"
          >
            <app-icon [name]="t.icon" />{{ t.label }}
          </button>
        }
      </div>
      <span class="small muted">Newest First</span>
    </div>
    <app-status [busy]="busy()" [error]="error()" />
    @if (!auth.session()) {
      <app-sign-in-card
        action="view and manage your orders"
        path="/account/orders"
      />
    }
    <div class="customer-orders-layout">
      <section class="customer-order-list" aria-label="Your orders">
        @for (o of filtered(); track o.id) {
          <button
            class="customer-order-choice"
            [class.selected]="selectedOrder().id === o.id"
            (click)="selectedId.set(o.id)"
          >
            <span class="order-choice-icon"><app-icon name="box" /></span
            ><span class="grow"
              ><strong>{{ o.order_number }}</strong
              ><small
                >{{ o.order_date | date: "mediumDate" }} ·
                {{ o.items?.length || 0 }} items</small
              ><span class="order-choice-footer"
                ><span
                  class="badge"
                  [class.cancelled]="o.status === 'CANCELLED'"
                  >{{ o.status }}</span
                ><b>{{ o.total_amount | currency: "USD" }}</b></span
              ></span
            ><app-icon name="chevron" />
          </button>
        } @empty {
          @if (auth.session() && !busy() && !error()) {
            <div class="empty">
              <app-icon name="box" />
              <h2>No orders found</h2>
              <p>
                {{
                  search
                    ? "Try another order number."
                    : "Your orders will appear here after checkout."
                }}
              </p>
              <a routerLink="/shop" class="button primary">Start Shopping</a>
            </div>
          }
        }
      </section>
      @if (selectedOrder(); as o) {
        <section class="panel order-preview">
          <div class="section-heading">
            <h2>Order #{{ o.order_number }}</h2>
            <span class="badge" [class.cancelled]="o.status === 'CANCELLED'">{{
              o.status
            }}</span>
          </div>
          <p>Placed on {{ o.order_date | date: "medium" }}</p>
          @if (
            !["CANCELLED", "FAILED", "REFUNDED", "CHECKOUT_PENDING"].includes(
              o.status
            )
          ) {
            <app-order-progress [status]="o.status" />
          }
          <div class="order-preview-items">
            <h3>Items ({{ o.items?.length || 0 }})</h3>
            @for (item of o.items || []; track item.id) {
              <div class="line-item">
                <span class="icon-circle"><app-icon name="box" /></span>
                <div class="grow">
                  <h3>Product SKU #{{ item.product_sku_id }}</h3>
                  <p>Quantity: {{ item.quantity }}</p>
                </div>
                <strong>{{ item.total_price | currency: "USD" }}</strong>
              </div>
            }
          </div>
          <div class="total">
            <span>{{ "Total" | translate }}</span
            ><strong>{{ o.total_amount | currency: "USD" }}</strong>
          </div>
          <a
            class="button primary full"
            [routerLink]="['/account/orders', o.id]"
            >View Order Details <app-icon name="arrow"
          /></a>
          <a
            class="button outline full"
            [routerLink]="['/account/orders', o.id, 'track']"
            >{{ "Track Order" | translate }} <app-icon name="truck"
          /></a>
        </section>
      }
    </div>
    @if (auth.session()) {
      <div class="pagination">
        <button
          [disabled]="page === 0 || busy()"
          (click)="page = page - 1; load()"
        >
          {{ "Previous" | translate }}</button
        ><span>Page {{ page + 1 }} of {{ pages || 1 }}</span
        ><button
          [disabled]="page + 1 >= pages || busy()"
          (click)="page = page + 1; load()"
        >
          {{ "Next" | translate }}
        </button>
      </div>
    } }`,
})
export class OrdersPage extends PageState {
  embedded = input(false);
  language = input("en");
  date = "";
  resetFilters() { this.search = ""; this.date = ""; this.selectedId.set(null); this.filter(""); }
  api = inject(OrdersApi);
  auth = inject(AuthService);
  orders = signal<Order[]>([]);
  selectedId = signal<number | null>(null);
  selectedOrder() {
    const rows = this.filtered();
    return rows.find((o) => o.id === this.selectedId()) || rows[0];
  }
  page = 0;
  pages = 0;
  search = "";
  status = "";
  tabs = [
    { label: "All Orders", value: "", icon: "box" },
    { label: "Pending", value: "PENDING", icon: "clock" },
    { label: "Processing", value: "PROCESSING", icon: "box" },
    { label: "Shipped", value: "SHIPPED", icon: "truck" },
    { label: "Delivered", value: "DELIVERED", icon: "check" },
    { label: "Cancelled", value: "CANCELLED", icon: "close" },
  ];
  constructor() {
    super();
    this.load();
  }
  filter(value: string) {
    this.status = value;
    this.selectedId.set(null);
    this.page = 0;
    this.load();
  }
  load() {
    if (!this.auth.session()) return;
    this.run(this.api.history(this.page, this.status), (r) => {
      this.orders.set(r.content);
      this.pages = r.totalPages;
    });
  }
  filtered() {
    const q = this.search.toLowerCase();
    return this.orders().filter((o) =>
      ((o.order_number || "").toLowerCase().includes(q) || (o.status || "").toLowerCase().includes(q))
      && (!this.date || o.order_date?.slice(0,10) === this.date),
    );
  }
}
