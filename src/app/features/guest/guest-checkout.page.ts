import { conversationId as requestId } from '../../shared/utils/conversation-id';
import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GuestApi, GuestDelivery } from '../../core/storefront/guest.api';
import { StorefrontAccessService } from '../../core/storefront/storefront-access.service';
import { Cart } from '../../core/api/models';
import { PageState } from '../../shared/utils/page-state';
import { Status } from '../../shared/components/status';
@Component({
  selector: 'app-guest-checkout', imports: [FormsModule, CurrencyPipe, RouterLink, Status], styleUrl: './guest.scss',
  template: `<div class="breadcrumbs"><a routerLink="/cart">Shopping cart</a><span>›</span><span>Guest checkout</span></div>
    <div class="guest-heading"><span class="guest-badge">NO ACCOUNT NEEDED</span><h1>Checkout as a guest</h1><p>Add your delivery details and choose how to pay. <a routerLink="/auth" [queryParams]="{returnUrl:'/checkout'}">Already have an account? Sign in</a></p></div>
    <app-status [busy]="busy()" [error]="error()" [message]="message()" />
    @if (cart(); as cart) {
    <form #form="ngForm" (ngSubmit)="submit()" class="guest-grid"><section class="panel"><h2>Contact & delivery address</h2><p class="muted">All delivery fields marked * are required.</p>
      <fieldset [disabled]="busy()" class="guest-fields"><legend class="sr-only">Delivery details</legend>
        <label>Full name *<input name="fullName" [(ngModel)]="delivery.fullName" required maxlength="120" autocomplete="name" /></label>
        <label>Phone number *<input name="phone" [(ngModel)]="delivery.phone" required pattern="(?=(?:[^0-9]*[0-9]){7,15}[^0-9]*$)[+0-9 ()-]{7,30}" maxlength="30" type="tel" autocomplete="tel" /></label>
        <label class="wide">Email address {{ access.settings()?.requireGuestContactVerification ? '*' : '(optional)' }}<input name="email" [(ngModel)]="delivery.email" [required]="!!access.settings()?.requireGuestContactVerification" email type="email" maxlength="254" autocomplete="email" /></label>
        @if (access.settings()?.requireGuestContactVerification || delivery.email) {
          <div class="wide verification"><p>{{access.settings()?.requireGuestContactVerification ? "Verify your email before placing your order." : "Verify your email if you would like order updates by email."}}</p><button class="button outline" type="button" [disabled]="!delivery.email || busy()" (click)="sendCode()">Send verification code</button><label>8-digit email code<input name="code" [(ngModel)]="code" inputmode="numeric" maxlength="8" autocomplete="one-time-code" /></label><button class="button outline" type="button" [disabled]="code.length !== 8 || busy()" (click)="verifyCode()">Verify email</button></div>
        }
        <label>Province *<input name="province" [(ngModel)]="delivery.province" required maxlength="100" autocomplete="address-level1" /></label>
        <label>District *<input name="district" [(ngModel)]="delivery.district" required maxlength="100" autocomplete="address-level2" /></label>
        <label>Commune *<input name="commune" [(ngModel)]="delivery.commune" required maxlength="100" autocomplete="address-level3" /></label>
        <label>Village *<input name="village" [(ngModel)]="delivery.village" required maxlength="100" /></label>
        <label class="wide">Street / house *<input name="streetHouse" [(ngModel)]="delivery.streetHouse" required maxlength="250" autocomplete="street-address" /></label>
        <label class="wide">Delivery notes (optional)<textarea name="notes" [(ngModel)]="delivery.notes" maxlength="500" rows="3" placeholder="Landmarks or delivery instructions"></textarea></label>
      </fieldset>
      <h2>Payment method</h2><label class="payment-option"><input type="radio" name="payment" [(ngModel)]="paymentMethod" value="CASH_ON_DELIVERY" [disabled]="busy()" /><span><strong>Cash on delivery</strong><small>Pay when you receive your order.</small></span></label>
      @if (access.settings()?.guestPayment) {<label class="payment-option"><input type="radio" name="payment" [(ngModel)]="paymentMethod" value="BAKONG" [disabled]="busy()" /><span><strong>ABA / KHQR</strong><small>Scan your order’s QR using a compatible banking app.</small></span></label>}
    </section><aside class="panel guest-summary"><h2>Order summary</h2>
      @for (item of cart.items; track item.id) {<div class="summary-line"><span>SKU #{{item.product_sku_id}} × {{item.quantity}}</span><strong>{{item.total_price | currency:'USD'}}</strong></div>}
      <div class="summary-line total"><span>Total</span><strong>{{cart.total_price | currency:'USD'}}</strong></div>
      <div class="guest-notice"><strong>Keep access to your order</strong><p>A secure cookie links this browser to your guest orders. Clearing it or switching devices removes access from this browser.</p></div>
      <button class="button primary full" [disabled]="form.invalid || busy() || !cart.items.length || !access.settings()?.guestCheckout">{{ busy() ? 'Confirming order…' : 'Place order' }}</button><p class="muted">Prices and stock are checked by the store before your order is confirmed.</p><a routerLink="/cart">← Back to cart</a>
    </aside></form>
    }`,
})
export class GuestCheckoutPage extends PageState {
  private guest = inject(GuestApi); private router = inject(Router);
  access = inject(StorefrontAccessService); cart = signal<Cart | null>(null);
  delivery: GuestDelivery = {fullName:'', phone:'', email:'', province:'', district:'', commune:'', village:'', streetHouse:'', notes:''};
  paymentMethod = 'CASH_ON_DELIVERY'; code = '';
  private key = this.checkoutKey();
  private checkoutKey() { try { const saved=sessionStorage.getItem('eshop.guest.checkout-key'); if(saved) return saved; const key=requestId();sessionStorage.setItem('eshop.guest.checkout-key',key);return key; } catch {return requestId();} }
  constructor() { super(); this.run(this.guest.cart(), cart => this.cart.set(cart)); }
  sendCode() { this.run(this.guest.sendCode(this.delivery.email), () => this.message.set('Verification code sent. Check your email.')); }
  verifyCode() { this.run(this.guest.verifyCode(this.delivery.email, this.code), () => this.message.set('Email verified. You can place your order.')); }
  async submit() {
    const cart=this.cart(); if(this.busy() || !cart?.items.length) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    const body={delivery:{...this.delivery}, idempotencyKey:this.key, paymentMethod:this.paymentMethod, expectedTotal:cart.total_price};
    try {
      const confirmation=await firstValueFrom(this.guest.checkout(body));
      if (['FAILED','CANCELLED'].includes(confirmation.order.status)) {
        try {sessionStorage.removeItem('eshop.guest.checkout-key');} catch { /* Storage is optional. */ } this.key=this.checkoutKey();
        this.error.set('The order could not be confirmed. Return to your cart to review current stock and prices.');return;
      }
      try {sessionStorage.removeItem('eshop.guest.checkout-key');} catch { /* Storage is optional. */ }
      await this.router.navigate(['/guest/orders', confirmation.order.id]);
    } catch {this.error.set('Order confirmation is unavailable. Check your email verification, address, stock and access settings. Retry with the same details; your checkout reference prevents duplicate orders.');}
    finally {this.busy.set(false);}
  }
}
