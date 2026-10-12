import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
interface PaymentQrData {orderId:number;amount:number;currency:string;status:string;expiresAt:string;provider:string;}
@Component({selector:'app-payment-qr',imports:[TranslatePipe, CurrencyPipe,DatePipe],template:`
  <section aria-label="KHQR payment" class="qr-payment">
    <h3>Pay with KHQR</h3><p>Scan using a KHQR-compatible banking app. The shop verifies payment directly with Bakong.</p>
    @if(data();as p){<strong>{{p.amount | currency:p.currency}}</strong><p role="status">Payment: {{p.status}}</p>
      @if(p.status==='PENDING' && !expired(p)){@if(image()){<img [src]="image()" alt="Order-specific KHQR payment code" width="240" height="240" />}<p>Expires {{p.expiresAt | date:'short'}}</p>}
      @if(p.status==='PENDING' && expired(p)){<p>This QR has expired. Payment verification may still be pending. Do not pay this code.</p>}
      @if(p.status==='SUCCESS'){<p>Payment verified by Bakong. Your order status will update after processing.</p>}
    }
    @if(error()){<p role="alert">{{error()}}</p>}
    <button class="outline" [disabled]="busy()" (click)="refresh(false)">{{busy()?'Checking…':'Load payment QR'}}</button>
    @if(data()?.status==='PENDING'){<button [disabled]="busy()" (click)="refresh(true)">{{ "Check payment with Bakong" | translate }}</button>}
  </section>`,styles:[`.qr-payment{padding:16px;border:1px solid #dcebe3;border-radius:12px;margin:12px 0}.qr-payment img{display:block;max-width:100%;height:auto;margin:12px auto}.qr-payment button{margin:4px}.qr-payment p{font-size:13px;line-height:1.5}`]})
export class PaymentQr {
  orderId=input.required<number>(); private api=inject(ApiClient); private destroy=inject(DestroyRef);
  data=signal<PaymentQrData|null>(null); image=signal(''); busy=signal(false);error=signal(''); private version=0;
  private readonly clock=signal(Date.now());
  constructor(){const timer=setInterval(()=>this.clock.set(Date.now()),1000);effect(()=>{const id=this.orderId();this.version++;this.data.set(null);this.clearImage();void this.refresh(false,id);});this.destroy.onDestroy(()=>{clearInterval(timer);this.version++;this.clearImage();});}
  expired(p:PaymentQrData){return Date.parse(p.expiresAt)<=this.clock();}
  private clearImage(){if(this.image())URL.revokeObjectURL(this.image());this.image.set('');}
  async refresh(verify=false,id=this.orderId()){
    const version=this.version;this.busy.set(true);this.error.set('');
    try{
      const path=`/api/v1/payments/orders/${id}`;
      const p=await firstValueFrom(verify?this.api.post<PaymentQrData>(path+'/verify'):this.api.get<PaymentQrData>(path+'/qr'));
      if(version!==this.version)return;this.data.set(p);this.clearImage();
      if(p.status==='PENDING'&&!this.expired(p)){
        const blob=await firstValueFrom(this.api.http.get(this.api.url(path+'/qr/image'),{responseType:'blob'}));
        if(version===this.version)this.image.set(URL.createObjectURL(blob));
      }
    }catch{if(version===this.version)this.error.set('QR payment is not ready or verification is unavailable. Refresh shortly or contact the shop. No payment success has been assumed.');}
    finally{if(version===this.version)this.busy.set(false);}
  }
}

