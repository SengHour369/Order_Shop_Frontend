import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrdersApi } from '../orders/orders.api';
import { CheckoutReview } from '../checkout/checkout-review';
import { ApiClient } from '../../core/api/api-client';
import { CheckoutAttempt } from '../checkout/checkout-attempt';
import { AuthService } from '../../core/auth/auth.service';
import { PaymentQr } from './payment-qr';
import { Status } from '../../shared/components/status';
import { Order } from '../../core/api/models';

@Component({
  imports:[PaymentQr,Status],
  template:`<app-status [busy]="busy()" [error]="error()" />
    @if(order();as o){<app-payment-qr [orderId]="o.id" [orderNumber]="o.order_number" [paymentMethod]="o.paymentMethod || ''" (verified)="complete($event)" [checkoutFlow]="true" [actionBusy]="busy()" (returnCheckout)="returnToCheckout()" (cancelPayment)="leavePayment()" />}
    @else if(error()){<button type="button" (click)="load()">Try Again</button>}`,
  styles:[`:host{display:block;max-width:430px;margin:24px auto 60px;padding:20px;border:1px solid #edf0f7;border-radius:7px;background:white;min-height:620px;box-sizing:border-box}@media(max-width:650px){:host{margin:10px auto;padding:8px 0;border:0;min-height:0}}`]
})
export class CheckoutPaymentPage {
  private api=inject(OrdersApi);private review=inject(CheckoutReview);private route=inject(ActivatedRoute);private router=inject(Router);
  private payments=inject(ApiClient);private attempt=inject(CheckoutAttempt);private auth=inject(AuthService);
  complete(id:number){if(this.attempt.orderId(this.auth.userId())===id)this.attempt.clear(this.auth.userId());}
  order=signal<Order|null>(null);busy=signal(false);error=signal('');
  constructor(){void this.load();}
  async load(){this.busy.set(true);this.error.set('');try{this.order.set(await firstValueFrom(this.api.detail(Number(this.route.snapshot.paramMap.get('id')))));}catch{this.error.set('Unable to load your order. Please try again.');}finally{this.busy.set(false);}}
  async leavePayment(){
    const order=this.order();if(this.busy()||!order)return;
    this.busy.set(true);this.error.set('');
    try{
      this.attempt.attachOrder(this.auth.userId(),order.id);
      await this.router.navigate(['/checkout']);
    }catch{this.error.set('Unable to return to checkout. Your payment remains available; please try again.');}
    finally{this.busy.set(false);}
  }
  async returnToCheckout(){
    if(this.busy())return;this.busy.set(true);this.error.set('');
    try{
      let order=await firstValueFrom(this.api.detail(Number(this.route.snapshot.paramMap.get('id'))));
      const payment=await firstValueFrom(this.payments.post<{status:string;paymentVerified?:boolean}>(`/api/v1/payments/orders/${order.id}/verify`));
      if(payment.paymentVerified || !['FAILED','EXPIRED','CANCELLED'].includes(payment.status))
        throw new Error('Payment is still being reconciled. Do not pay again. Your order and checkout details remain saved.');
      if(order.status==='PENDING')order=await firstValueFrom(this.api.cancel(order.id,'CHANGED_MIND','Returning after the provider confirmed this payment attempt failed.'));
      this.order.set(order);
      await this.review.restore(order);
      await this.router.navigate(['/checkout']);
    }catch(e){this.error.set(e instanceof Error?e.message:'Checkout could not be restored yet. Please try again shortly.');}finally{this.busy.set(false);}
  }
}
