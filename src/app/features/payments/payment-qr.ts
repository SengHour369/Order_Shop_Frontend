import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
interface PaymentQrData {orderId:number;amount:number;currency:string;status:string;expiresAt:string;provider:string;paymentVerified?:boolean;transactionReference?:string;verifiedAt?:string;paidAmount?:number;orderStatus?:string;}
@Component({selector:'app-payment-qr',imports:[TranslatePipe, CurrencyPipe,DatePipe,RouterLink],template:`
  <section aria-label="KHQR payment" class="qr-payment" [class.payment-workspace]="chatLayout()" [class.chat-receipt]="compactReceipt() && data()?.status === 'SUCCESS'">
    <div class="payment-steps" aria-label="Payment progress"><div class="done"><b>✓</b><small>Checkout</small></div><div [class.active]="data()?.status==='PENDING' && !expired(data()!) && !failed()" [class.done]="data()?.status==='SUCCESS'" [class.failed]="failed()"><b>{{failed()?'×':data()?.status==='SUCCESS'?'✓':'▣'}}</b><small>Payment</small></div><div [class.done]="data()?.status==='SUCCESS' && orderConfirmed()"><b>{{data()?.status==='SUCCESS' && orderConfirmed()?'✓':'⚑'}}</b><small>Confirm</small></div></div>
    @if(unavailable()){<h3>KHQR unavailable</h3>}
    @else if(data();as p){
      @if(p.status==='SUCCESS'){
        @if(chatLayout()) {
          <header class="payment-workspace-heading verified-heading"><span class="workspace-symbol">✓</span><div><h3>Payment Verified Successfully</h3><p>{{orderConfirmed() ? 'Your payment is verified and your order is confirmed.' : 'Payment verified. The shop is confirming your order; do not pay again.'}}</p></div><span class="workspace-status completed">Completed</span></header>
          <div class="verified-grid"><dl class="workspace-facts"><div><dt>Order Number</dt><dd>{{orderNumber() || p.orderId || orderId()}}</dd></div><div><dt>Payment Method</dt><dd>{{p.provider || 'KHQR'}}</dd></div><div><dt>Paid Amount</dt><dd class="workspace-amount">{{(p.paidAmount ?? p.amount) | currency:p.currency}}</dd></div>@if(p.verifiedAt){<div><dt>Payment Time</dt><dd>{{p.verifiedAt | date:'medium'}}</dd></div>}@if(p.transactionReference){<div><dt>Transaction</dt><dd>{{p.transactionReference}}</dd></div>}</dl><div><div class="received-note"><strong>Payment has been received successfully.</strong><p>Payment verified by Bakong. {{orderConfirmed() ? 'Your order is being processed.' : 'Order confirmation is pending.'}}</p></div><a class="payment-outline" [routerLink]="['/account/orders',orderId()]">View Order Details</a></div></div>
        } @else if(compactReceipt()) {
          <div class="compact-payment" role="status"><span class="compact-check" aria-hidden="true">✓</span><div class="compact-title"><h3>Payment Completed</h3><p>Payment verified by Bakong.</p></div><dl><div><dt>Order Number</dt><dd>{{orderNumber() || p.orderId}}</dd></div><div><dt>Payment Method</dt><dd>{{p.provider || 'KHQR'}}</dd></div><div><dt>Amount</dt><dd class="paid-amount">{{(p.paidAmount ?? p.amount) | currency:p.currency}}</dd></div>@if(p.verifiedAt){<div><dt>Payment Date</dt><dd>{{p.verifiedAt | date:'medium'}}</dd></div>}<div><dt>Status</dt><dd><span class="paid-badge">Completed</span></dd></div></dl></div>
        } @else {
        <div class="result-symbol success">✓</div><h3 class="success-text">Payment Successful!</h3><p>{{orderConfirmed()?'Your order has been confirmed.':'Your payment is verified. The shop is confirming your order; do not pay again.'}}</p>
        <div class="payment-receipt" role="status"><div><span>Order Number</span><strong>{{orderNumber() || p.orderId || orderId()}}</strong></div><div><span>Payment Method</span><strong>{{paymentMethod()==='ABA'?'ABA Pay (KHQR)':'KHQR'}}</strong></div><div><span>Amount</span><strong>{{(p.paidAmount ?? p.amount) | currency:p.currency}}</strong></div>@if(p.verifiedAt){<div><span>Payment Time</span><strong>{{p.verifiedAt | date:'medium'}}</strong></div>}<p>Payment verified by Bakong. Your order status will update after processing.</p>@if(p.transactionReference){<small>Transaction: {{p.transactionReference}}</small>}@if(p.orderStatus){<small>Order: {{p.orderStatus}}</small>}</div>
        <a class="payment-primary" [routerLink]="['/orders',orderId()]">View Order Details</a><a class="payment-outline" routerLink="/shop">Continue Shopping</a>
        }
      }@else if(failed()){
        <div class="result-symbol failure">×</div><h3 class="failure-text">Payment Failed</h3><p>Your payment was not completed.</p><div class="failure-note" role="alert"><strong>{{expired(p)?'The QR code has expired.':'Payment was not received.'}}</strong><p>The payment service reported this attempt unsuccessful. Do not pay this code. We will recheck before restoring checkout.</p></div>@if(checkoutFlow()){<button class="payment-primary red" [disabled]="actionBusy()" (click)="returnCheckout.emit()">{{actionBusy()?'Restoring checkout…':'Return to Checkout'}}</button>}@else{<a class="payment-primary red" [routerLink]="['/orders',orderId()]">View Order Details</a>}@if(checkoutFlow()){<button class="payment-outline red-text" [disabled]="actionBusy()" (click)="returnCheckout.emit()">Try Again</button>}@else{<button class="payment-outline red-text" [disabled]="busy()" (click)="refresh(true)">Check Payment Again</button>}<div class="payment-info"><strong>Don't worry!</strong><p>You can review your order and check the payment status again before retrying.</p></div>
      }@else if(p.status==='REVIEW_REQUIRED'){<div class="payment-info" role="alert">A transaction exists, but its payment evidence needs shop review. Do not pay again.</div>}
      @else if(expired(p)){
        <h3>QR Expired — Checking Payment</h3><p>This code can no longer be used. Expiration does not confirm whether a payment was received.</p><div class="payment-info" role="status"><strong>Payment reconciliation pending</strong><p>We are checking with the bank. Your order and checkout details remain saved. Do not pay again.</p></div><button class="payment-outline" [disabled]="busy()" (click)="refresh(true)">{{busy()?'Checking…':'Check Payment Status'}}</button>
      }
      @else{
        @if(chatLayout()) {
          <header class="payment-workspace-heading"><span class="workspace-symbol">▣</span><div><h3>Complete Payment</h3><p>Scan the KHQR code to pay for your order.</p></div><span class="workspace-status">Pending Payment</span></header>
          <div class="payment-workspace-grid"><section class="workspace-qr"><h4>KHQR Payment</h4><p>Scan with any KHQR banking app.</p>@if(image()){<img [src]="image()" alt="Order-specific KHQR payment code" width="240" height="240" />}@else{<div class="qr-loading" role="status">Preparing your secure QR…</div>}<p class="qr-instruction">Scan this KHQR code with your banking app to complete the payment.</p></section><section class="workspace-information"><h4>Payment Information</h4><dl class="workspace-facts"><div><dt>Order Number</dt><dd>{{orderNumber() || p.orderId || orderId()}}</dd></div><div><dt>Payment Method</dt><dd>{{p.provider || 'KHQR'}}</dd></div><div><dt>Amount Due</dt><dd class="workspace-amount">{{p.amount | currency:p.currency}}</dd></div><div><dt>Expiry Time</dt><dd class="workspace-expiry">{{remaining(p)}}</dd></div></dl><h4>Payment Progress</h4><ol class="workspace-progress"><li class="done"><b>✓</b><span>Order Created</span></li><li [class.done]="!!image()" [class.active]="!image()"><b>2</b><span>QR Generated</span></li><li class="active"><b>3</b><span>Waiting for Payment</span></li><li><b>4</b><span>Payment Verified</span></li></ol></section></div>
          <div class="workspace-actions"><button class="payment-primary" [disabled]="busy()" (click)="refresh(true)">{{busy()?'Checking…':'Refresh Status'}}</button>@if(image()){<a class="payment-outline" [href]="image()" [download]="'KHQR-order-'+orderId()+'.png'">Download QR</a>}</div><div class="payment-info" role="status"><strong>Waiting for payment verification...</strong><p>Payment is confirmed only after verification by your payment provider.</p></div>
        } @else {
        <h3>Complete Your Payment</h3><p>Scan the QR code below using ABA Mobile or<br> any KHQR banking app.</p>
        <div class="qr-code-card"><div class="bank-marks"><span>ABA<sup>•</sup></span><span>KHQR</span></div>@if(image()){<img [src]="image()" alt="Order-specific KHQR payment code" width="240" height="240" />}@else{<div class="qr-loading">Preparing your secure QR…</div>}<small>Amount</small><strong class="qr-amount">{{p.amount | currency:p.currency}}</strong></div>
        <div class="expiry"><small>◷ &nbsp; This QR code will expire in</small><strong>{{remaining(p)}}</strong></div><div class="payment-info" role="status"><strong>ⓘ &nbsp; Waiting for payment verification...</strong><p>We will automatically confirm your payment.</p></div>
        }
      }
    }@else if(!unavailable()){<h3>Complete Your Payment</h3><p>Preparing your secure payment code…</p>}
    @if(checkoutFlow() && data()?.status==='PENDING' && !expired(data()!) && !failed()){<button class="payment-outline red-text" [disabled]="actionBusy()||busy()" (click)="cancelPayment.emit()">{{actionBusy()?'Returning to checkout…':'Cancel Payment'}}</button><p class="payment-exit-note">This closes the QR screen. Your existing order stays pending while bank verification continues; you can resume it from checkout.</p>}
    @if(error()){<p role="alert">{{error()}}</p>}
    @if((!chatLayout() || !data() || data()?.status==='REVIEW_REQUIRED') && !unavailable() && (!checkoutFlow() || !data()) && data()?.status!=='SUCCESS' && !failed()){<button class="payment-outline" [disabled]="busy()" (click)="refresh(false)">{{busy()?'Checking…':data()?'Refresh payment':'Retry payment QR'}}</button>}
    @if(!chatLayout() && !checkoutFlow() && data()?.status==='PENDING' && !expired(data()!) && !failed()){<button class="verification-button" [disabled]="busy()" (click)="refresh(true)">{{ "Check payment with Bakong" | translate }}</button>}
  </section>`,styleUrl:'./payment-qr.scss'})

export class PaymentQr {
  chatLayout=input(false);
  compactReceipt=input(false);
  verified=output<number>();
  orderNumber=input('');paymentMethod=input('');checkoutFlow=input(false);actionBusy=input(false);returnCheckout=output<void>();cancelPayment=output<void>();
  orderId=input.required<number>(); private api=inject(ApiClient); private destroy=inject(DestroyRef);
  unavailable=signal(false); data=signal<PaymentQrData|null>(null); image=signal(''); busy=signal(false);error=signal(''); private version=0;private inFlightVersion=-1;private readyDeadline=0;
  private readonly clock=signal(Date.now());
  constructor(){const timer=setInterval(()=>this.clock.set(Date.now()),1000);const poll=setInterval(()=>{const p=this.data();if(!p&&!this.busy()&&Date.now()<this.readyDeadline){void this.refresh(false);return;}if(p?.status==='PENDING'&&!this.busy())void this.refresh(true);else if(p?.status==='SUCCESS'&&this.checkoutFlow()&&!this.orderConfirmed()&&!this.busy())void this.refresh(false);},5000);effect(()=>{const id=this.orderId();untracked(()=>{this.version++;this.readyDeadline=Date.now()+120000;this.unavailable.set(false);this.data.set(null);this.clearImage();void this.refresh(false,id);});});this.destroy.onDestroy(()=>{clearInterval(timer);clearInterval(poll);this.version++;this.clearImage();});}
  failed(){const p=this.data();return !!p && (['FAILED','EXPIRED','CANCELLED'].includes(p.status));}
  orderConfirmed(){return ['PROCESSING','SHIPPED','DELIVERED'].includes(this.data()?.orderStatus??'');}
  remaining(p:PaymentQrData){const seconds=Math.max(0,Math.ceil((Date.parse(p.expiresAt)-this.clock())/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  expired(p:PaymentQrData){return Date.parse(p.expiresAt)<=this.clock();}
  private clearImage(){if(this.image())URL.revokeObjectURL(this.image());this.image.set('');}
  async refresh(verify=false,id=this.orderId()){
    const version=this.version;if(this.inFlightVersion===version)return;this.inFlightVersion=version;this.busy.set(true);this.error.set('');
    try{
      const path=`/api/v1/payments/orders/${id}`;
      let p=await firstValueFrom(verify?this.api.post<PaymentQrData>(path+'/verify'):this.api.get<PaymentQrData>(path+'/qr'));
      if(p.status==='SUCCESS'&&(p.paymentVerified!==true||['CANCELLED','FAILED'].includes(p.orderStatus??'')))p={...p,status:'REVIEW_REQUIRED'};
      if(version!==this.version)return;const previous=this.data();this.data.set(p);
      if(p.status!=='PENDING'||this.expired(p))this.clearImage();
      if(p.status==='SUCCESS'&&(!this.checkoutFlow()||this.orderConfirmed())&&(previous?.status!=='SUCCESS'||this.checkoutFlow()&&!['PROCESSING','SHIPPED','DELIVERED'].includes(previous?.orderStatus??'')))this.verified.emit(id);
      if(p.status==='PENDING'&&!this.expired(p)&&(!this.image()||previous?.expiresAt!==p.expiresAt)){
        this.clearImage();
        const blob=await firstValueFrom(this.api.http.get(this.api.url(path+'/qr/image'),{responseType:'blob'}));
        if(version===this.version)this.image.set(URL.createObjectURL(blob));
      }
    }catch(error){
      if(version!==this.version)return;
      if([404,503].includes((error as {status?:number})?.status || 0)){
        try {
          const methods=await firstValueFrom(this.api.get<string[]>('/api/v1/payments/methods'));
          if(version!==this.version)return;
          if(!methods.some(method=>['BAKONG','KHQR','ABA'].includes(method))){
            this.readyDeadline=0;this.unavailable.set(true);
            this.error.set('KHQR is not enabled for this store. Contact the store to arrange payment for this order. No payment has been confirmed.');return;
          }
        } catch { /* Keep retrying when availability itself cannot be determined. */ }
      }
      if(version===this.version)this.error.set('QR payment is not ready or verification is unavailable. We retry automatically for up to two minutes while preparing your QR. No payment success has been assumed.');}
    finally{if(this.inFlightVersion===version)this.inFlightVersion=-1;if(version===this.version)this.busy.set(false);}
  }
}

