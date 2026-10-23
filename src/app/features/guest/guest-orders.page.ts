import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GuestApi, GuestOrder, GuestPayment } from '../../core/storefront/guest.api';
import { PageState } from '../../shared/utils/page-state';
import { Status } from '../../shared/components/status';
@Component({imports: [CurrencyPipe, DatePipe, RouterLink, Status], styleUrl: './guest.scss', template: `
  <div class="guest-heading"><span class="guest-badge">SECURE GUEST ACCESS</span><h1>{{id ? 'Your order' : 'Guest orders'}}</h1><p>Orders are available only in the browser used for checkout. <a routerLink="/shop">Continue shopping →</a></p></div>
  <app-status [busy]="busy()" [error]="error()" [message]="message()" />
  @if (order(); as order) {
    <div class="guest-grid"><section class="panel"><h2 class="order-number">{{order.orderNumber}}</h2><span class="status-pill">{{order.status}}</span><p>{{order.createdAt | date:'medium'}}</p>
      @for (item of order.items; track item.skuId) {<div class="summary-line"><span>SKU #{{item.skuId}} × {{item.quantity}}</span><strong>{{item.total | currency:order.currency}}</strong></div>}
      <div class="summary-line total"><span>Total</span><strong>{{order.totalAmount | currency:order.currency}}</strong></div><p class="muted">Delivery progress follows the order status: processing → shipped → delivered.</p>
      @if (order.status === 'CHECKOUT_PENDING') {<p role="status">The store is confirming stock. Your order reference is saved; do not place another order.</p>}
      <div class="guest-actions"><button class="button outline" (click)="refresh()" [disabled]="busy()">Refresh status</button><a class="button outline" routerLink="/guest/orders">All guest orders</a></div></section>
    <aside class="panel"><h2>Payment</h2>
      @if (order.paymentMethod === 'CASH_ON_DELIVERY') {<p>Cash on delivery. Pay when your order arrives.</p>}
      @else {
        @if (payment(); as payment) {
          <p role="status">{{payment.status === 'SUCCESS' && payment.paymentVerified ? 'Payment received · Verified by the payment provider' : payment.status}}</p>
          @if (image() && payment.paymentAllowed !== false && payment.status === 'PENDING' && !expired(payment)) {<img class="qr-image" [src]="image()" alt="KHQR code for this order" /><p>Scan with your banking app. Expires {{payment.expiresAt | date:'short'}}.</p>}
          @if (expired(payment) && payment.status === 'PENDING') {<p>This QR has expired. Do not pay it. The store will reconcile the final provider status.</p>}
          @if (payment.paymentAllowed === false && payment.status === 'PENDING') {<p>Online guest payment is currently disabled by the store. Contact the shop before paying.</p>}
          @if (payment.status === 'FAILED') {<p>Payment failed or expired. Wait for your order status to update before starting a new checkout.</p>}
          @if (payment.transactionReference) {<p>Reference: {{payment.transactionReference}}</p>}
        } @else {<p>Your payment QR is being prepared. Status refreshes automatically.</p>}
        <p class="muted">Payment is confirmed directly with the provider. A bank screenshot does not confirm payment.</p>
      }
    </aside></div>
  } @else if (!busy()) {
    <div class="orders-list">@for (order of rows(); track order.id) {<article class="order-card"><div><strong class="order-number">{{order.orderNumber}}</strong><p>{{order.createdAt | date:'mediumDate'}} · {{order.totalAmount | currency:order.currency}}</p><span class="status-pill">{{order.status}}</span></div><a class="button outline" [routerLink]="['/guest/orders',order.id]">View order</a></article>} @empty {<p>No guest orders available. Tracking may be disabled, or this browser’s guest cookie may have expired.</p>}</div>
    <button class="button outline" (click)="load()">Reload orders</button>
  }`})
export class GuestOrdersPage extends PageState {
  private guest=inject(GuestApi); private destroy=inject(DestroyRef);
  id=Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || 0;
  order=signal<GuestOrder | null>(null); rows=signal<GuestOrder[]>([]); payment=signal<GuestPayment | null>(null); image=signal('');
  private token=''; private alive=true;
  constructor() {super(); this.load(); const timer=setInterval(()=>{if(this.id && !this.busy() && !['DELIVERED','FAILED','CANCELLED'].includes(this.order()?.status || '')) void this.refresh();},5000);
    this.destroy.onDestroy(()=>{this.alive=false;clearInterval(timer);this.clearImage();});}
  load() {if(this.id) {this.run(this.guest.access(this.id), result=>{this.token=result.orderAccessToken;this.order.set(result.order);void this.refresh();});} else this.run(this.guest.orders(), rows=>this.rows.set(rows));}
  expired(payment: GuestPayment) {return !!payment.expiresAt && Date.parse(payment.expiresAt)<=Date.now();}
  private clearImage() {if(this.image()) URL.revokeObjectURL(this.image());this.image.set('');}
  async refresh() {
    if(this.busy() || !this.token) return;
    this.busy.set(true);this.error.set('');
    try {
      const order=await firstValueFrom(this.guest.order(this.id,this.token));if(!this.alive)return;this.order.set(order);
      if(order.paymentMethod!=='CASH_ON_DELIVERY' && order.status!=='CHECKOUT_PENDING') {
        try {
          let payment=await firstValueFrom(this.guest.payment(this.id,this.token));if(!this.alive)return;
          if(payment.status==='SUCCESS' && !payment.paymentVerified) payment={...payment,status:'REVIEW_REQUIRED'};
          this.payment.set(payment);
          if(payment.status==='PENDING' && payment.paymentAllowed!==false && !this.expired(payment) && !this.image()) {
            const blob=await firstValueFrom(this.guest.paymentImage(this.id,this.token));if(this.alive)this.image.set(URL.createObjectURL(blob));
          } else if(payment.status!=='PENDING' || payment.paymentAllowed===false || this.expired(payment)) this.clearImage();
        } catch {this.message.set('Payment status is not ready. The store is still checking; no payment success has been assumed.');}
      }
    } catch {this.error.set('Order access expired or unavailable. Reload this page to request fresh access from this browser.');}
    finally {this.busy.set(false);}
  }
}
