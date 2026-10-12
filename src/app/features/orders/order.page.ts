import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  Component,
  inject,
  signal,
  viewChild,
  ElementRef,
} from "@angular/core";
import { PaymentQr } from "../payments/payment-qr";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { OrdersApi } from "./orders.api";
import { AddressesApi } from "../addresses/addresses.api";
import { Order, Address } from "../../core/api/models";
import { Icon } from "../../shared/components/icon";
import { OrderProgress } from "../../shared/components/order-progress";
import { PageState } from "../../shared/utils/page-state";
import { Status } from "../../shared/components/status";
@Component({
  imports: [TranslatePipe, PaymentQr, CurrencyPipe, DatePipe, RouterLink, Icon, OrderProgress, Status],
  template: `<div class="page-heading">
      <div>
        <h1>{{ "Order Details" | translate }}</h1>
        <p>View your order information, status, and delivery address.</p>
      </div>
      <a class="button outline" routerLink="/account/orders">← My Orders</a>
    </div>
    <app-status [busy]="busy()" [error]="error()" />
    @if (order(); as o) {
      <div class="page-heading compact-heading">
        <div>
          <h3>Order #{{ o.order_number }}</h3>
          <p>Placed on {{ o.order_date | date: "medium" }}</p>
        </div>
        <button class="outline" [disabled]="busy()" (click)="load()">
          <app-icon name="refresh" />Refresh Status
        </button>
      </div>
      <div class="order-detail-grid">
        <div>
          <section class="panel">
            @if (
              !["FAILED", "CANCELLED", "REFUNDED", "CHECKOUT_PENDING"].includes(
                o.status
              )
            ) {
              <app-order-progress [status]="o.status" />
            }
            <div class="order-status-banner">
              <span class="icon-circle"
                ><app-icon [name]="o.status === 'SHIPPED' ? 'truck' : 'box'"
              /></span>
              <div>
                <h3>{{ statusText(o.status) }}</h3>
                <p>Status: {{ o.status }}</p>
              </div>
            </div>
            <h2>Items ({{ o.items?.length || 0 }})</h2>
            @for (item of o.items || []; track item.id) {
              <div class="order-item">
                <span class="item-placeholder"><app-icon name="box" /></span>
                <div class="grow">
                  <h3>Product SKU #{{ item.product_sku_id }}</h3>
                  <p>{{ item.unit_price | currency: "USD" }} each</p>
                </div>
                <span class="pill">Qty: {{ item.quantity }}</span
                ><strong>{{ item.total_price | currency: "USD" }}</strong>
              </div>
            }
          </section>
          <section class="panel" id="tracking">
            <h2>{{ 'Tracking Information' | translate }}</h2>
            <a class="button outline full" [routerLink]="['/account/orders', o.id, 'track']"><app-icon name="truck" />{{ 'Track Order' | translate }}</a>
            <p>
              Order status is provided by the shop. Courier tracking and
              estimated delivery dates are not yet available.
            </p>
            <div class="tracking-event">
              <span class="icon-circle green"><app-icon name="check" /></span>
              <div>
                <h3>{{ "Order placed" | translate }}</h3>
                <p>{{ o.order_date | date: "medium" }}</p>
              </div>
            </div>
          </section>
        </div>
        <aside>
          <section class="panel">
            <h2>{{ "Order Summary" | translate }}</h2>
            <div class="summary-row">
              <span>Items</span><strong>{{ o.items?.length || 0 }}</strong>
            </div>
            <div class="total">
              <span>{{ "Total" | translate }}</span
              ><strong>{{ o.total_amount | currency: "USD" }}</strong>
            </div>
            <p class="small muted">Total confirmed by the shop.</p>
          </section>
          <section class="panel">
            <h2>{{ "Payment Information" | translate }}</h2>@if(o.status === 'PENDING'){<app-payment-qr [orderId]="o.id" />}
            <p>Check the payment service for your confirmed payment status.</p>
            <a
              class="button outline full"
              routerLink="/account/payments"
              [queryParams]="{ order: o.id }"
              ><app-icon name="card" />View Payments</a
            >
          </section>
          <section class="panel">
            <h2>{{ "Shipping Information" | translate }}</h2>
            @if (address(); as a) {
              <p>
                <app-icon name="pin" /> {{ a.address_line1 }}, {{ a.city }},
                {{ a.country }} {{ a.zip_code }}
              </p>
            } @else {
              <p>Saved address #{{ o.shipping_address_id }}</p>
            }
          </section>
          <a class="button outline full" routerLink="/account/support"
            ><app-icon name="headphones" />{{ "Contact Support" | translate }}</a
          >
          @if (o.status === "PENDING") {
            <button
              class="danger-outline full"
              [disabled]="busy()"
              (click)="cancelDialog().nativeElement.showModal()"
            >
              {{ "Cancel Order" | translate }}
            </button>
          }
          @if (o.status === "CHECKOUT_PENDING") {
            <a class="button primary full" routerLink="/checkout"
              >Resume Checkout</a
            >
          }
          @if (o.status === "FAILED") {
            <a class="button primary full" routerLink="/cart">{{ "Return to Cart" | translate }}</a>
          }
        </aside>
      </div>
      <dialog
        #cancelEditor
        class="customer-dialog cancel-dialog"
        aria-labelledby="cancel-title"
      >
        <div class="dialog-heading">
          <h2 id="cancel-title">{{ "Cancel Order" | translate }}</h2>
          <button
            class="icon-button"
            aria-label="Close cancellation"
            (click)="cancelDialog().nativeElement.close()"
          >
            <app-icon name="close" />
          </button>
        </div>
        <div class="cancellation-notice">
          <app-icon name="help" />
          <div>
            <h3>Are you sure you want to cancel this order?</h3>
            <p>
              The shop will check whether your order can still be cancelled.
            </p>
          </div>
        </div>
        <p>
          Order #{{ o.order_number }} · {{ o.total_amount | currency: "USD" }}
        </p>
        <app-status [error]="error()" />
        <div class="dialog-actions">
          <button
            [disabled]="busy()"
            (click)="cancelDialog().nativeElement.close()"
          >
            {{ "Keep Order" | translate }}</button
          ><button class="danger" [disabled]="busy()" (click)="cancel(o.id)">
            {{ (busy() ? "Cancelling…" : "Cancel Order") | translate }}
          </button>
        </div>
      </dialog>
    }`,
})
export class OrderPage extends PageState {
  api = inject(OrdersApi);
  addresses = inject(AddressesApi);
  route = inject(ActivatedRoute);
  order = signal<Order | null>(null);
  address = signal<Address | null>(null);
  cancelDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>("cancelEditor");
  constructor() {
    super();
    this.load();
  }
  load() {
    this.run(
      this.api.detail(Number(this.route.snapshot.paramMap.get("id"))),
      (o) => {
        this.order.set(o);
        this.addresses.detail(o.shipping_address_id).subscribe({
          next: (a) => this.address.set(a),
          error: () => this.address.set(null),
        });
      },
    );
  }
  cancel(id: number) {
    this.run(this.api.cancel(id), (o) => {
      this.order.set(o);
      this.cancelDialog().nativeElement.close();
    });
  }
  statusText(s: string) {
    return (
      (
        {
          SHIPPED: "Your order has been shipped!",
          DELIVERED: "Your order has been delivered.",
          PROCESSING: "Your order is being prepared.",
          PENDING: "Your order has been placed.",
          CHECKOUT_PENDING: "Confirming stock for your order.",
          FAILED: "This checkout could not be completed.",
          CANCELLED: "This order was cancelled.",
          REFUNDED: "This order was refunded.",
        } as Record<string, string>
      )[s] || "Your latest order update"
    );
  }
}
