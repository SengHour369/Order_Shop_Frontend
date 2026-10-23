import { CancelOrderDialog } from './cancellation/cancel-order-dialog';
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  Component,
  effect,
  ElementRef,
  viewChild,
  inject,
  signal,
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
  imports: [CancelOrderDialog, TranslatePipe, PaymentQr, CurrencyPipe, DatePipe, RouterLink, Icon, OrderProgress, Status],
  styles: [`.order-detail-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }.payment-dialog{width:min(440px,calc(100vw - 32px));max-height:90dvh;overflow:auto;box-sizing:border-box;border:1px solid #dce7f2;border-radius:18px;padding:20px;color:#101c43}.payment-dialog::backdrop{background:#101c4370}.payment-dialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}.payment-dialog h2{margin:0;font-size:21px}.payment-dialog header button{background:white;color:#526187;border:1px solid #dce7f2;border-radius:8px;padding:6px 12px}.payment-dialog>p{font-size:13px;color:#64729b}`],
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
        <div class="order-detail-actions">
          <button class="outline" [disabled]="busy()" (click)="load()"><app-icon name="refresh" />{{ 'Refresh Status' | translate }}</button>
          @if (o.status === 'PENDING') { <button class="danger-outline" [disabled]="busy()" (click)="cancelEditor.open()"><app-icon name="trash" />{{ 'Cancel Order' | translate }}</button> }
        </div>
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
            <h2>{{ "Payment Information" | translate }}</h2>@if(o.status === 'PENDING' && !paymentOpen()){<app-payment-qr [orderId]="o.id" (verified)="load()" />}
            <p>Check the payment service for your confirmed payment status.</p>
            <a
              class="button outline full"
              [routerLink]="o.paymentMethod && o.paymentMethod !== 'CASH_ON_DELIVERY' ? ['/checkout/payment', o.id] : ['/account/payments']"
              [queryParams]="o.paymentMethod && o.paymentMethod !== 'CASH_ON_DELIVERY' ? {} : { order: o.id }"
              ><app-icon name="card" />{{o.paymentMethod && o.paymentMethod !== 'CASH_ON_DELIVERY' ? 'View QR Payment' : 'View Payments'}}</a
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
      @if(paymentOpen()) {
        <dialog #paymentDialog class="payment-dialog" aria-labelledby="payment-heading" (cancel)="paymentOpen.set(false)">
          <header><h2 id="payment-heading">Complete your payment</h2><button type="button" (click)="paymentOpen.set(false)" aria-label="Close payment">Close</button></header>
          <p>Order #{{o.order_number}} · Payment is checked automatically.</p>
          <app-payment-qr [orderId]="o.id" (verified)="load()" />
        </dialog>
      }
      <app-cancel-order-dialog #cancelEditor [order]="o" (cancelled)="order.set($event)" />
    }`,
})
export class OrderPage extends PageState {
  api = inject(OrdersApi);
  addresses = inject(AddressesApi);
  route = inject(ActivatedRoute);
  paymentOpen = signal(this.route.snapshot.queryParamMap.get('payment') === 'qr');
  paymentDialog = viewChild<ElementRef<HTMLDialogElement>>('paymentDialog');
  order = signal<Order | null>(null);
  address = signal<Address | null>(null);
  constructor() {
    super();
    effect(() => {
      const dialog = this.paymentDialog()?.nativeElement;
      if (this.paymentOpen() && dialog && !dialog.open) dialog.showModal();
    });
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
