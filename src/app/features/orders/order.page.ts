import { ProductImage } from "../../shared/components/product-image";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CatalogApi } from "../catalog/catalog.api";
import { CancelOrderDialog } from './cancellation/cancel-order-dialog';
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  Component,
  DestroyRef,
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
  host: {class: "customer-order-view"},
  styleUrl: "./order-detail.scss",
  imports: [ProductImage, CancelOrderDialog, TranslatePipe, PaymentQr, CurrencyPipe, DatePipe, RouterLink, Icon, OrderProgress, Status],
  styles: [`.order-detail-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }.payment-dialog{width:min(440px,calc(100vw - 32px));max-height:90dvh;overflow:auto;box-sizing:border-box;border:1px solid #dce7f2;border-radius:18px;padding:20px;color:#101c43}.payment-dialog::backdrop{background:#101c4370}.payment-dialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}.payment-dialog h2{margin:0;font-size:21px}.payment-dialog header button{background:white;color:#526187;border:1px solid #dce7f2;border-radius:8px;padding:6px 12px}.payment-dialog>p{font-size:13px;color:#64729b}`],
  template: `<div class="page-heading">
      <div>
        <span class="order-eyebrow">YOUR PURCHASE</span><h1>{{ "Order Details" | translate }}</h1>
        <p>Everything about your purchase, in one place.</p>
      </div>
      <a class="button outline" routerLink="/account/orders">← My Orders</a>
    </div>
    <app-status [busy]="busy()" [error]="error()" />
    @if (order(); as o) {
<section class="panel order-journey" aria-label="Order progress">
            @if (
              !["FAILED", "CANCELLED", "REFUNDED", "CHECKOUT_PENDING"].includes(
                o.status
              )
            ) {
              <app-order-progress [status]="o.status" />
            }
            <div class="order-status-banner" [class.negative]="['FAILED','CANCELLED','REFUNDED'].includes(o.status)">
              <span class="icon-circle"
                ><app-icon [name]="o.status === 'SHIPPED' ? 'truck' : 'box'"
              /></span>
              <div>
                <h3>{{ statusText(o.status) }}</h3>
                <p>{{ o.status.replaceAll('_',' ') }}</p>
              </div>
            </div>
          @if(o.status === 'PENDING'){<button class="danger-outline" [disabled]="busy()" (click)="cancelEditor.open()">{{'Cancel Order' | translate}}</button>}
          </section>
      <div class="order-detail-grid">
        <div>

          <section class="panel purchased-items" aria-label="Purchased products">
            <div class="section-title"><h2>Your items</h2><span>{{o.items?.length || 0}} products</span></div>
            @for (item of o.items || []; track item.id) {
              <div class="order-item">
                <span class="item-placeholder">@if(productImages()[item.product_sku_id]){<img appProductImage [src]="productImages()[item.product_sku_id]" alt="" loading="lazy" />}@else{<app-icon name="box" />}</span>
                <div class="grow">
                  <h3>{{ productNames()[item.product_sku_id] || 'Ordered product' }}</h3>
                  <p>{{ item.unit_price | currency: "USD" }} each</p>
                </div>
                <span class="pill">Qty: {{ item.quantity }}</span
                ><strong>{{ item.total_price | currency: "USD" }}</strong>
              </div>
            }
          </section>
          <section class="panel" id="tracking">
            <div class="section-title"><h2>Order updates</h2><a class="tracking-link" [routerLink]="['/account/orders',o.id,'track']">Track order <app-icon name="chevron" /></a></div>
            <ol class="order-update-list">
              @if(o.status !== 'PENDING' && o.status !== 'CHECKOUT_PENDING'){
                <li class="latest"><span class="update-dot"></span><div><h3>{{statusText(o.status)}}</h3>@if(o.updated_at){<time>{{o.updated_at | date:'MMM d, y · h:mm a'}}</time>}@else{<p>Latest shop status</p>}</div></li>
              }
              <li><span class="update-dot"></span><div><h3>Order placed</h3><time>{{o.order_date | date:'MMM d, y · h:mm a'}}</time></div></li>
            </ol>
            <p class="tracking-note">Updates supplied by the shop. Open tracking for more delivery information.</p>
          </section>
        </div>
        <aside>

          <section class="panel">
            <h2>{{ "Payment Information" | translate }}</h2>
            <div class="payment-method"><app-icon name="card" /><strong>{{o.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : o.paymentMethod || 'Payment method unavailable'}}</strong></div>
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
              <div class="shipping-address"><app-icon name="pin" /><div>
                @if(a.recipient_name){<strong>{{a.recipient_name}}</strong>}
                <p>{{a.address_line1}}</p><p>{{a.city}}, {{a.country}} {{a.zip_code}}</p>
                @if(a.phone_number){<p>{{a.phone_number}}</p>}
              </div></div>
            } @else {
              <p>Shipping address is currently unavailable.</p>
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
  private catalog=inject(CatalogApi);
  private destroy=inject(DestroyRef);
  productNames=signal<Record<number,string>>({});
  productImages=signal<Record<number,string>>({});
  private requested=new Set<number>();
  itemCount(){return (this.order()?.items||[]).reduce((count,item)=>count+item.quantity,0);}
  productTitle(){
    const names=[...new Set((this.order()?.items||[]).map(item=>this.productNames()[item.product_sku_id]).filter(Boolean))];
    return names.length?names.join(', '):'Ordered products';
  }
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
        for(const id of new Set((o.items||[]).map(item=>item.product_sku_id))){
          if(this.requested.has(id))continue;
          this.requested.add(id);
          this.catalog.forSku(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
            next:product=>{
              this.productNames.update(names=>({...names,[id]:product.name}));
              this.productImages.update(images=>({...images,[id]:product.skus?.find(sku=>sku.id===id)?.image_url||product.main_image?.[0]||''}));
            },
            error:()=>this.requested.delete(id)
          });
        }
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
